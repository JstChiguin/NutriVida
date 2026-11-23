param(
    [switch]$IncluirDocs
)

$ErrorActionPreference = 'Stop'
Set-StrictMode -Version Latest

$autor = 'Chiguin'
$versionHerramienta = '1.0.0'
$carpetaScript = Split-Path -Parent $MyInvocation.MyCommand.Path

if (Test-Path -LiteralPath (Join-Path $carpetaScript 'docker-compose.yml') -PathType Leaf) {
    $carpetaProyecto = $carpetaScript
} elseif (Test-Path -LiteralPath (Join-Path (Split-Path -Parent $carpetaScript) 'docker-compose.yml') -PathType Leaf) {
    $carpetaProyecto = Split-Path -Parent $carpetaScript
} else {
    throw 'No se encontro docker-compose.yml. Guarda el script en la raiz de NutriVida o en NutriVida\scripts.'
}

$carpetaProyecto = (Resolve-Path -LiteralPath $carpetaProyecto).Path
$nombreProyecto = Split-Path -Leaf $carpetaProyecto
$carpetaEntregas = Join-Path (Split-Path -Parent $carpetaProyecto) 'Entregas-NutriVida'
$nombreZip = 'NutriVida-Entrega-' + (Get-Date -Format 'yyyyMMdd-HHmmss') + '.zip'
$rutaZip = Join-Path $carpetaEntregas $nombreZip

$carpetasPermitidas = @('backend', 'frontend', 'mongodb', 'scripts')
if ($IncluirDocs) {
    $carpetasPermitidas += 'docs'
}

$archivosRaizPermitidos = @(
    'README.md', '.env.example', '.gitignore', '.gitattributes',
    'docker-compose.yml', 'docker-compose.yaml', 'compose.yml', 'compose.yaml',
    'LICENSE', 'LICENSE.md', 'LICENSE.txt'
)

$carpetasProhibidas = @(
    '.git', '.claude', '.vscode', '.idea', '.vs', 'node_modules',
    'dist', 'coverage', 'target', 'build', 'out', '.cache', '.vite',
    '.next', '.nuxt', '.turbo', '.gradle', '.venv', 'venv',
    '__pycache__', '.pytest_cache', 'test-results', 'playwright-report',
    'logs', 'tmp', 'temp'
)

$nombresProhibidos = @(
    '.npmrc', '.pypirc', '.netrc', '.dockercfg', 'credentials.json',
    'service-account.json', 'id_rsa', 'id_ed25519', 'known_hosts',
    'generar-zip-evaluacion.ps1'
)

$extensionesProhibidas = @(
    '.pem', '.key', '.p12', '.pfx', '.jks', '.keystore', '.ppk',
    '.kdbx', '.db', '.sqlite', '.sqlite3', '.bak', '.log', '.tmp',
    '.zip', '.7z', '.rar', '.tar', '.gz', '.dump', '.class', '.jar',
    '.pyc', '.exe', '.dll'
)

$extensionesTexto = @(
    '.js', '.jsx', '.mjs', '.cjs', '.ts', '.tsx', '.java', '.json',
    '.yaml', '.yml', '.xml', '.properties', '.md', '.txt', '.html',
    '.css', '.scss', '.sh', '.ps1', '.toml', '.gradle', '.sql'
)

$patronesCredenciales = @(
    '-----BEGIN (RSA |EC |OPENSSH )?PRIVATE KEY-----',
    '(mongodb(\+srv)?|postgres(ql)?|mysql)://[^/\s:@]+:[^@\s]+@',
    'AKIA[0-9A-Z]{16}',
    'github_pat_[A-Za-z0-9_]{20,}',
    'ghp_[A-Za-z0-9]{20,}',
    'sk-proj-[A-Za-z0-9_-]{20,}'
)

$archivosSeleccionados = New-Object 'System.Collections.Generic.List[System.IO.FileInfo]'
$contadorExcluidos = 0

function Agregar-ArchivoSeguro {
    param([System.IO.FileInfo]$Archivo)

    $nombre = $Archivo.Name
    $extension = $Archivo.Extension
    $esArchivoDeEntorno = $nombre -match '^\.env(\..*)?$'
    $esArchivoDeEjemplo = $nombre -eq '.env.example'
    $esArchivoSecreto = $nombre -match '^(secrets?|credentials?)(\.|$)'
    $esArchivoTemporal = $nombre -match '^(~\$|\.DS_Store$|Thumbs\.db$)' -or $nombre.EndsWith('~')

    if (
        (($Archivo.Attributes -band [System.IO.FileAttributes]::ReparsePoint) -ne 0) -or
        ($esArchivoDeEntorno -and -not $esArchivoDeEjemplo) -or
        $esArchivoSecreto -or $esArchivoTemporal -or
        ($nombresProhibidos -contains $nombre) -or
        ($extensionesProhibidas -contains $extension)
    ) {
        $script:contadorExcluidos++
        return
    }

    if ($Archivo.Length -gt 25MB) {
        throw ('Archivo demasiado grande para una entrega de codigo: ' + $Archivo.FullName)
    }

    if ($extensionesTexto -contains $extension -or $esArchivoDeEjemplo) {
        $contenido = [System.IO.File]::ReadAllText($Archivo.FullName)
        foreach ($patron in $patronesCredenciales) {
            if ([System.Text.RegularExpressions.Regex]::IsMatch($contenido, $patron, [System.Text.RegularExpressions.RegexOptions]::IgnoreCase)) {
                throw ('Posible credencial detectada. Revisa este archivo antes de generar el ZIP: ' + $Archivo.FullName)
            }
        }
    }

    [void]$archivosSeleccionados.Add($Archivo)
}

foreach ($nombreArchivo in $archivosRaizPermitidos) {
    $rutaArchivo = Join-Path $carpetaProyecto $nombreArchivo
    if (Test-Path -LiteralPath $rutaArchivo -PathType Leaf) {
        Agregar-ArchivoSeguro -Archivo (Get-Item -LiteralPath $rutaArchivo)
    }
}

foreach ($nombreCarpeta in $carpetasPermitidas) {
    $rutaCarpeta = Join-Path $carpetaProyecto $nombreCarpeta
    if (-not (Test-Path -LiteralPath $rutaCarpeta -PathType Container)) {
        continue
    }

    $pendientes = New-Object 'System.Collections.Generic.Stack[System.IO.DirectoryInfo]'
    $pendientes.Push((Get-Item -LiteralPath $rutaCarpeta))

    while ($pendientes.Count -gt 0) {
        $carpetaActual = $pendientes.Pop()
        foreach ($elemento in (Get-ChildItem -LiteralPath $carpetaActual.FullName -Force)) {
            if (($elemento.Attributes -band [System.IO.FileAttributes]::ReparsePoint) -ne 0) {
                $contadorExcluidos++
                continue
            }

            if ($elemento.PSIsContainer) {
                if ($carpetasProhibidas -contains $elemento.Name) {
                    $contadorExcluidos++
                } else {
                    $pendientes.Push($elemento)
                }
            } else {
                Agregar-ArchivoSeguro -Archivo $elemento
            }
        }
    }
}

if ($archivosSeleccionados.Count -eq 0) {
    throw 'No se encontraron archivos validos para incluir en el ZIP.'
}

[void][System.IO.Directory]::CreateDirectory($carpetaEntregas)
Add-Type -AssemblyName System.IO.Compression
Add-Type -AssemblyName System.IO.Compression.FileSystem

$archivoZip = $null
try {
    $archivoZip = [System.IO.Compression.ZipFile]::Open($rutaZip, [System.IO.Compression.ZipArchiveMode]::Create)
    foreach ($archivo in ($archivosSeleccionados | Sort-Object FullName)) {
        $rutaRelativa = $archivo.FullName.Substring($carpetaProyecto.Length + 1).Replace('\', '/')
        $rutaDentroZip = $nombreProyecto + '/' + $rutaRelativa
        [void][System.IO.Compression.ZipFileExtensions]::CreateEntryFromFile(
            $archivoZip,
            $archivo.FullName,
            $rutaDentroZip,
            [System.IO.Compression.CompressionLevel]::Optimal
        )
    }
} catch {
    if ($null -ne $archivoZip) {
        $archivoZip.Dispose()
        $archivoZip = $null
    }
    if (Test-Path -LiteralPath $rutaZip) {
        Remove-Item -LiteralPath $rutaZip -Force
    }
    throw
} finally {
    if ($null -ne $archivoZip) {
        $archivoZip.Dispose()
    }
}

$tamanoMb = [Math]::Round((Get-Item -LiteralPath $rutaZip).Length / 1MB, 2)
Write-Host ''
Write-Host ('Generador de entregas | Autor: ' + $autor + ' | Version: ' + $versionHerramienta)
Write-Host ('ZIP creado: ' + $rutaZip) -ForegroundColor Green
Write-Host ('Archivos incluidos: ' + $archivosSeleccionados.Count)
Write-Host ('Elementos excluidos: ' + $contadorExcluidos)
Write-Host ('Tamano: ' + $tamanoMb + ' MB')
Write-Host ('Documentacion docs incluida: ' + [bool]$IncluirDocs)
Write-Host 'Revisa el contenido del ZIP antes de compartirlo. La deteccion de secretos no sustituye una auditoria manual.'
