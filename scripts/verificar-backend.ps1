param(
    [string]$ImagenMaven = "maven:3.9-eclipse-temurin-21",
    [string]$ImagenMongo = "mongo:7"
)

$ErrorActionPreference = "Continue"
$raiz = Split-Path -Parent $PSScriptRoot
$backend = Join-Path $raiz "backend"
$red = "red-pruebas-nutrivida"
$contenedorMongo = "mongo-pruebas-nutrivida"
$rutaReportes = Join-Path $backend "*\target\surefire-reports\TEST-*.xml"
$rutaJacoco = Join-Path $backend "*\target\site\jacoco\jacoco.csv"

function Limpiar {
    docker rm -f $contenedorMongo *> $null
    docker network rm $red *> $null
}

function Terminar([int]$codigo, [string]$mensaje) {
    Write-Host $mensaje -ForegroundColor Red
    Limpiar
    exit $codigo
}

Get-ChildItem -Path (Join-Path $backend "*\target\surefire-reports") -ErrorAction SilentlyContinue |
    Remove-Item -Recurse -Force -ErrorAction SilentlyContinue
Get-ChildItem -Path (Join-Path $backend "*\target\site\jacoco") -ErrorAction SilentlyContinue |
    Remove-Item -Recurse -Force -ErrorAction SilentlyContinue

Limpiar
docker network create $red | Out-Null
docker run -d --name $contenedorMongo --network $red $ImagenMongo | Out-Null

$listo = $false
for ($i = 0; $i -lt 30 -and -not $listo; $i++) {
    docker exec $contenedorMongo mongosh --quiet --eval "db.adminCommand('ping').ok" *> $null
    if ($LASTEXITCODE -eq 0) { $listo = $true } else { Start-Sleep -Seconds 2 }
}
if (-not $listo) { Terminar 1 "MongoDB aislado no respondió" }

docker run --rm --network $red `
    -e NUTRIVIDA_MONGO_SERVIDOR_PRUEBAS="mongodb://${contenedorMongo}:27017" `
    -v "${backend}:/ws" -v nutrivida-m2:/root/.m2 -w /ws $ImagenMaven `
    mvn -B verify *>&1 | Tee-Object -FilePath (Join-Path $backend "ultima-ejecucion.log") |
    Select-String -Pattern "Tests run:.*Skipped: \d+$|BUILD|ERROR\]"
$codigoMaven = $LASTEXITCODE

$total = 0; $fallos = 0; $errores = 0; $omitidas = 0
foreach ($reporte in Get-ChildItem -Path $rutaReportes -ErrorAction SilentlyContinue) {
    [xml]$xml = Get-Content $reporte.FullName
    $total += [int]$xml.testsuite.tests
    $fallos += [int]$xml.testsuite.failures
    $errores += [int]$xml.testsuite.errors
    $omitidas += [int]$xml.testsuite.skipped
}
$declaradas = (Get-ChildItem -Path $backend -Recurse -Filter "*Pruebas.java" |
    Where-Object { $_.FullName -match "src\\test" } |
    Select-String -Pattern "^\s*@Test\b").Count

Write-Host ""
Write-Host "Metodos @Test declarados: $declaradas"
Write-Host "Pruebas ejecutadas: $total | fallos: $fallos | errores: $errores | omitidas: $omitidas"

foreach ($csv in Get-ChildItem -Path $rutaJacoco -ErrorAction SilentlyContinue) {
    $filas = Import-Csv $csv.FullName
    $lineasCubiertas = ($filas | Measure-Object -Property LINE_COVERED -Sum).Sum
    $lineasPerdidas = ($filas | Measure-Object -Property LINE_MISSED -Sum).Sum
    $ramasCubiertas = ($filas | Measure-Object -Property BRANCH_COVERED -Sum).Sum
    $ramasPerdidas = ($filas | Measure-Object -Property BRANCH_MISSED -Sum).Sum
    $modulo = $csv.Directory.Parent.Parent.Parent.Name
    Write-Host ("Cobertura {0}: lineas {1:P1} | ramas {2:P1}" -f $modulo,
        ($lineasCubiertas / [math]::Max(1, $lineasCubiertas + $lineasPerdidas)),
        ($ramasCubiertas / [math]::Max(1, $ramasCubiertas + $ramasPerdidas)))
}

if ($codigoMaven -ne 0) { Terminar 5 "Maven termino con codigo $codigoMaven" }
if ($total -eq 0) { Terminar 2 "No se encontraron reportes de pruebas" }
if ($total -lt $declaradas) { Terminar 6 "Se ejecutaron $total pruebas pero hay $declaradas metodos @Test declarados" }
if ($omitidas -gt 0) { Terminar 3 "Hay $omitidas pruebas omitidas: la verificacion completa no es valida" }
if ($fallos -gt 0 -or $errores -gt 0) { Terminar 4 "Hay pruebas fallidas" }

Limpiar
Write-Host "Verificacion completa de backend: OK" -ForegroundColor Green
