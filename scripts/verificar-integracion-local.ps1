param(
    [string]$Base = "http://localhost:8080",
    [string]$CorreoAdministrador = $env:NUTRIVIDA_ADMIN_CORREO,
    [string]$ContrasenaAdministrador = $env:NUTRIVIDA_ADMIN_CONTRASENA,
    [string]$ContrasenaDemo = $env:NUTRIVIDA_CONTRASENA_DEMO,
    [string]$SecretoJwt = $env:NUTRIVIDA_JWT_SECRETO
)

$ErrorActionPreference = "Continue"
$resultados = New-Object System.Collections.Generic.List[object]

function Registrar([string]$caso, [bool]$ok, [string]$detalle) {
    $resultados.Add([pscustomobject]@{ Caso = $caso; Estado = $(if ($ok) { "APROBADO" } else { "FALLIDO" }); Detalle = $detalle })
}

function Llamar([string]$metodo, [string]$ruta, $cuerpo = $null, [string]$token = $null, $sesion = $null, [hashtable]$cabeceras = @{}) {
    $parametros = @{ Uri = "$Base$ruta"; Method = $metodo; UseBasicParsing = $true; ErrorAction = "Stop" }
    $h = @{} + $cabeceras
    if ($token) { $h["Authorization"] = "Bearer $token" }
    if ($h.Count -gt 0) { $parametros["Headers"] = $h }
    if ($null -ne $cuerpo) { $parametros["Body"] = ($cuerpo | ConvertTo-Json -Depth 8); $parametros["ContentType"] = "application/json" }
    if ($sesion) { $parametros["WebSession"] = $sesion }
    try {
        $r = Invoke-WebRequest @parametros
        $json = $null
        if ($r.Content) { try { $json = $r.Content | ConvertFrom-Json } catch { } }
        return [pscustomobject]@{ Estado = [int]$r.StatusCode; Json = $json; Cabeceras = $r.Headers }
    } catch {
        $codigo = 0; $json = $null
        if ($_.Exception.Response) {
            $codigo = [int]$_.Exception.Response.StatusCode
            try {
                $lector = New-Object System.IO.StreamReader($_.Exception.Response.GetResponseStream())
                $json = $lector.ReadToEnd() | ConvertFrom-Json
            } catch { }
        }
        return [pscustomobject]@{ Estado = $codigo; Json = $json; Cabeceras = @{} }
    }
}

function Iniciar([string]$correo, [string]$contrasena, $sesion) {
    return Llamar "POST" "/autenticacion/api/v1/autenticacion/iniciar-sesion" @{ correo = $correo; contrasena = $contrasena } $null $sesion
}

function Base64Url([byte[]]$bytes) { [Convert]::ToBase64String($bytes).TrimEnd('=').Replace('+', '-').Replace('/', '_') }

function TokenExpirado([string]$usuarioId) {
    $cabecera = Base64Url ([Text.Encoding]::UTF8.GetBytes('{"alg":"HS256","typ":"JWT"}'))
    $exp = [DateTimeOffset]::UtcNow.AddMinutes(-5).ToUnixTimeSeconds()
    $iat = $exp - 60
    $carga = Base64Url ([Text.Encoding]::UTF8.GetBytes("{`"jti`":`"expirado`",`"iss`":`"nutrivida`",`"sub`":`"$usuarioId`",`"correo`":`"x@nutrivida.test`",`"rol`":`"PACIENTE`",`"iat`":$iat,`"exp`":$exp}"))
    $hmac = New-Object Security.Cryptography.HMACSHA256 (, [Text.Encoding]::UTF8.GetBytes($SecretoJwt))
    $firma = Base64Url ($hmac.ComputeHash([Text.Encoding]::UTF8.GetBytes("$cabecera.$carga")))
    return "$cabecera.$carga.$firma"
}

$A = "/autenticacion/api/v1"; $C = "/clinico/api/v1"; $G = "/agenda/api/v1"

$sAdmin = New-Object Microsoft.PowerShell.Commands.WebRequestSession
$admin = Iniciar $CorreoAdministrador $ContrasenaAdministrador $sAdmin
$tokenAdmin = $admin.Json.token
Registrar "06a Login válido (administrador)" ($admin.Estado -eq 200 -and $tokenAdmin) "HTTP $($admin.Estado), tipo $($admin.Json.tipo), expira en $($admin.Json.expiraEnSegundos) s"
$invalido = Iniciar $CorreoAdministrador "Incorrecta99" $null
Registrar "06b Login inválido" ($invalido.Estado -eq 401) "HTTP $($invalido.Estado)"

$cookie = $sAdmin.Cookies.GetCookies([Uri]"$Base$A/autenticacion/refrescar") | Where-Object { $_.Name -eq "nutrivida_refresco" }
Registrar "10a Cookie de refresco enviada solo a la ruta del servicio y HttpOnly" ($cookie -and $cookie.HttpOnly -and $cookie.Path -eq "/autenticacion/api/v1/autenticacion") "Path=$($cookie.Path) HttpOnly=$($cookie.HttpOnly) Secure=$($cookie.Secure)"
$otraRuta = $sAdmin.Cookies.GetCookies([Uri]"$Base$C/servicios") | Where-Object { $_.Name -eq "nutrivida_refresco" }
Registrar "10b La cookie no se envía a otros servicios" (-not $otraRuta) "cookie visible en /clinico: $([bool]$otraRuta)"

$sinCsrf = Llamar "POST" "$A/autenticacion/refrescar" $null $null $sAdmin
Registrar "10c Renovación sin cabecera anti-CSRF" ($sinCsrf.Estado -eq 403) "HTTP $($sinCsrf.Estado)"
$cookieAntes = $cookie.Value
$renov = Llamar "POST" "$A/autenticacion/refrescar" $null $null $sAdmin @{ "X-Nutrivida-Csrf" = "1" }
$cookieDespues = ($sAdmin.Cookies.GetCookies([Uri]"$Base$A/autenticacion/refrescar") | Where-Object { $_.Name -eq "nutrivida_refresco" }).Value
Registrar "10d Renovación válida rota la cookie y entrega nuevo token" ($renov.Estado -eq 200 -and $renov.Json.token -and $renov.Json.token -ne $tokenAdmin -and $cookieDespues -ne $cookieAntes) "HTTP $($renov.Estado), cookie rotada=$($cookieDespues -ne $cookieAntes)"
$tokenAdmin = $renov.Json.token

$sReuso = New-Object Microsoft.PowerShell.Commands.WebRequestSession
$cookieVieja = New-Object System.Net.Cookie("nutrivida_refresco", $cookieAntes, "/autenticacion/api/v1/autenticacion", ([Uri]$Base).Host)
$sReuso.Cookies.Add($cookieVieja)
$reuso = Llamar "POST" "$A/autenticacion/refrescar" $null $null $sReuso @{ "X-Nutrivida-Csrf" = "1" }
Registrar "10e Reutilización de un refresh token rotado" ($reuso.Estado -eq 401) "HTTP $($reuso.Estado)"
$trasReuso = Llamar "POST" "$A/autenticacion/refrescar" $null $null $sAdmin @{ "X-Nutrivida-Csrf" = "1" }
Registrar "10f La reutilización revoca toda la familia" ($trasReuso.Estado -eq 401) "HTTP $($trasReuso.Estado)"

$sAdmin = New-Object Microsoft.PowerShell.Commands.WebRequestSession
$admin = Iniciar $CorreoAdministrador $ContrasenaAdministrador $sAdmin
$tokenAdmin = $admin.Json.token

$sin = Llamar "GET" "$A/usuarios"
$falso = Llamar "GET" "$A/usuarios" $null "token.falso.invalido"
$expirado = Llamar "GET" "$A/usuarios" $null (TokenExpirado $admin.Json.usuario.id)
Registrar "07 Sin token, inválido y expirado: 401" ($sin.Estado -eq 401 -and $falso.Estado -eq 401 -and $expirado.Estado -eq 401) "sin=$($sin.Estado) invalido=$($falso.Estado) expirado=$($expirado.Estado)"

$nombreServicio = "Prestación de integración " + (Get-Random -Maximum 99999)
$cuerpoServicio = @{ nombre = $nombreServicio; descripcion = "Prestación ficticia de prueba"; categoria = "Control"; duracionMinutos = 30; precioReferencial = 20000 }
$crear = Llamar "POST" "$C/servicios" $cuerpoServicio $tokenAdmin
$idServicio = $crear.Json.id
$leer = Llamar "GET" "$C/servicios/$idServicio"
$cuerpoServicio.precioReferencial = 22000
$editar = Llamar "PUT" "$C/servicios/$idServicio" $cuerpoServicio $tokenAdmin
$desactivar = Llamar "PATCH" "$C/servicios/$idServicio/estado" @{ activo = $false } $tokenAdmin
Registrar "02 CRUD de prestaciones (crear, leer, editar, desactivar)" ($crear.Estado -eq 201 -and $leer.Estado -eq 200 -and $editar.Estado -eq 200 -and $editar.Json.precioReferencial -eq 22000 -and $desactivar.Estado -eq 200) "POST=$($crear.Estado) GET=$($leer.Estado) PUT=$($editar.Estado) PATCH=$($desactivar.Estado)"

$malo = Llamar "POST" "$C/servicios" @{ nombre = "ab"; descripcion = ""; categoria = "C"; duracionMinutos = 5; precioReferencial = -1 } $tokenAdmin
Registrar "03 Datos inválidos: 400" ($malo.Estado -eq 400) "HTTP $($malo.Estado)"
$noExiste = Llamar "GET" "$C/servicios/000000000000000000000000"
Registrar "04 Recurso inexistente: 404" ($noExiste.Estado -eq 404) "HTTP $($noExiste.Estado)"
$cuerpoServicio.nombre = $nombreServicio.ToUpper()
$dup = Llamar "POST" "$C/servicios" $cuerpoServicio $tokenAdmin
Registrar "05 Conflicto de negocio (nombre duplicado): 409" ($dup.Estado -eq 409) "HTTP $($dup.Estado)"

$sPac = New-Object Microsoft.PowerShell.Commands.WebRequestSession
$pac = Iniciar "valentina.rojas@nutrivida.demo" $ContrasenaDemo $sPac
$tokenPac = $pac.Json.token
Registrar "06c Login válido (paciente)" ($pac.Estado -eq 200) "HTTP $($pac.Estado), rol $($pac.Json.usuario.rol)"
$rolInsuf = Llamar "POST" "$C/servicios" $cuerpoServicio $tokenPac
Registrar "08 Rol insuficiente: 403" ($rolInsuf.Estado -eq 403) "HTTP $($rolInsuf.Estado)"
$usuariosPac = Llamar "GET" "$A/usuarios" $null $tokenPac
Registrar "08b Paciente no lista usuarios: 403" ($usuariosPac.Estado -eq 403) "HTTP $($usuariosPac.Estado)"
$usuariosAdmin = Llamar "GET" "$A/usuarios" $null $tokenAdmin
Registrar "09 Rol autorizado (administrador lista usuarios)" ($usuariosAdmin.Estado -eq 200) "HTTP $($usuariosAdmin.Estado)"

$misCitas = Llamar "GET" "$G/citas" $null $tokenPac
$citaId = $misCitas.Json.contenido[0].id
$sNutri = New-Object Microsoft.PowerShell.Commands.WebRequestSession
$nutri = Iniciar "rodrigo.sepulveda@nutrivida.demo" $ContrasenaDemo $sNutri
Registrar "14a Paciente consulta sus citas a través de Nginx (agenda)" ($misCitas.Estado -eq 200 -and $misCitas.Json.contenido.Count -ge 1) "HTTP $($misCitas.Estado), citas=$($misCitas.Json.contenido.Count)"

$miPerfil = Llamar "GET" "$C/pacientes/yo" $null $tokenPac
$idPropio = $miPerfil.Json.id
$sPac2 = New-Object Microsoft.PowerShell.Commands.WebRequestSession
$pac2 = Iniciar "matias.soto@nutrivida.demo" $ContrasenaDemo $sPac2
$perfil2 = Llamar "GET" "$C/pacientes/yo" $null $pac2.Json.token
$ajeno = Llamar "GET" "$C/pacientes/$($perfil2.Json.id)" $null $tokenPac
$fichaAjena = Llamar "GET" "$C/pacientes/$($perfil2.Json.id)/ficha-clinica" $null $tokenPac
$propia = Llamar "GET" "$C/pacientes/$idPropio/ficha-clinica" $null $tokenPac
Registrar "13b Privacidad: un paciente no consulta datos ni ficha de otro" ($ajeno.Estado -eq 403 -and $fichaAjena.Estado -eq 403) "perfil ajeno=$($ajeno.Estado) ficha ajena=$($fichaAjena.Estado)"
Registrar "13c Un paciente consulta su propia ficha" ($propia.Estado -eq 200) "HTTP $($propia.Estado)"

$tokenNutri = $nutri.Json.token
$pacientesNutri = Llamar "GET" "$C/pacientes" $null $tokenNutri
$fichaNoAutorizada = Llamar "GET" "$C/pacientes/$($perfil2.Json.id)/ficha-clinica" $null $tokenNutri
Registrar "13d Nutricionista accede solo a pacientes autorizados" ($pacientesNutri.Estado -eq 200 -and $fichaNoAutorizada.Estado -eq 403) "pacientes=$($pacientesNutri.Estado) ficha de paciente no autorizado=$($fichaNoAutorizada.Estado)"
$fichaAdmin = Llamar "GET" "$C/pacientes/$idPropio/ficha-clinica" $null $tokenAdmin
Registrar "13e Administrador sin acceso indiscriminado a fichas clínicas" ($fichaAdmin.Estado -eq 403) "HTTP $($fichaAdmin.Estado)"

$internos = Llamar "POST" "/clinico/api/v1/internos/pacientes/x/nutricionistas/y/autorizacion" @{} $tokenAdmin
Registrar "14b Endpoints internos no expuestos por Nginx" ($internos.Estado -eq 404) "HTTP $($internos.Estado)"

$rutaSpa = Llamar "GET" "/mis-citas"
Registrar "13a URL directa de la SPA servida por Nginx (la restricción por rol la aplica React y el API)" ($rutaSpa.Estado -eq 200) "HTTP $($rutaSpa.Estado)"

if ($citaId) {
    $pagos = Llamar "GET" "$G/citas/$citaId/pagos" $null $tokenPac
    $pagoDup = Llamar "POST" "$G/citas/$citaId/pagos" @{ metodo = "TARJETA_SIMULADA" } $tokenPac
    $nutriPagos = Llamar "GET" "$G/citas/$citaId/pagos" $null $tokenNutri
    Registrar "14c Pagos: consulta propia y duplicado rechazado o nuevo pago según estado" (($pagos.Estado -eq 200) -and ($pagoDup.Estado -in 201, 409, 400)) "GET pagos=$($pagos.Estado) POST pago=$($pagoDup.Estado)"
    Registrar "14d El nutricionista no accede a los pagos" ($nutriPagos.Estado -in 403, 404) "HTTP $($nutriPagos.Estado)"
}

$desact = Llamar "PATCH" "$A/usuarios/$($pac2.Json.usuario.id)/estado" @{ activo = $false } $tokenAdmin
$trasDesact = Llamar "GET" "$C/pacientes/yo" $null $pac2.Json.token
$renovDesact = Llamar "POST" "$A/autenticacion/refrescar" $null $null $sPac2 @{ "X-Nutrivida-Csrf" = "1" }
$loginDesact = Iniciar "matias.soto@nutrivida.demo" $ContrasenaDemo $null
Registrar "03b Usuario desactivado: access token previo, renovación y login rechazados" ($desact.Estado -eq 200 -and $trasDesact.Estado -eq 401 -and $renovDesact.Estado -eq 401 -and $loginDesact.Estado -eq 403) "desactivar=$($desact.Estado) token previo=$($trasDesact.Estado) renovación=$($renovDesact.Estado) login=$($loginDesact.Estado)"
$reactiv = Llamar "PATCH" "$A/usuarios/$($pac2.Json.usuario.id)/estado" @{ activo = $true } $tokenAdmin

$salida = Llamar "POST" "$A/autenticacion/cerrar-sesion" $null $tokenPac $sPac @{}
$trasSalida = Llamar "GET" "$A/autenticacion/yo" $null $tokenPac
$renovSalida = Llamar "POST" "$A/autenticacion/refrescar" $null $null $sPac @{ "X-Nutrivida-Csrf" = "1" }
Registrar "12 Logout revoca el token de acceso y la renovación" ($salida.Estado -eq 204 -and $trasSalida.Estado -eq 401 -and $renovSalida.Estado -eq 401) "logout=$($salida.Estado) token tras logout=$($trasSalida.Estado) renovación=$($renovSalida.Estado)"

$resultados | Format-Table -AutoSize -Wrap | Out-String -Width 220
$fallidos = ($resultados | Where-Object { $_.Estado -eq "FALLIDO" }).Count
Write-Host "Total: $($resultados.Count) | Aprobados: $($resultados.Count - $fallidos) | Fallidos: $fallidos"
if ($fallidos -gt 0) { exit 1 }
