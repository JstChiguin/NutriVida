param(
    [string]$ImagenMaven = "maven:3.9-eclipse-temurin-21",
    [string]$ImagenMongo = "mongo:7",
    [int]$MinimoPruebas = 1
)

$ErrorActionPreference = "Stop"
$raiz = Split-Path -Parent $PSScriptRoot
$backend = Join-Path $raiz "backend"
$red = "red-pruebas-nutrivida"
$contenedorMongo = "mongo-pruebas-nutrivida"

function Limpiar {
    docker rm -f $contenedorMongo *> $null
    docker network rm $red *> $null
}

Limpiar
docker network create $red | Out-Null
docker run -d --name $contenedorMongo --network $red $ImagenMongo | Out-Null

try {
    $listo = $false
    for ($i = 0; $i -lt 30 -and -not $listo; $i++) {
        docker exec $contenedorMongo mongosh --quiet --eval "db.adminCommand('ping').ok" *> $null
        if ($LASTEXITCODE -eq 0) { $listo = $true } else { Start-Sleep -Seconds 2 }
    }
    if (-not $listo) { throw "MongoDB aislado no respondió" }

    docker run --rm --network $red `
        -e NUTRIVIDA_MONGO_SERVIDOR_PRUEBAS="mongodb://${contenedorMongo}:27017" `
        -v "${backend}:/ws" -v nutrivida-m2:/root/.m2 -w /ws $ImagenMaven `
        mvn -B clean verify 2>&1 | Tee-Object -FilePath (Join-Path $raiz "backend\ultima-ejecucion.log") | Select-String -Pattern "Tests run:.*Skipped: \d+$|BUILD|ERROR\]"

    $total = 0; $fallos = 0; $errores = 0; $omitidas = 0
    Get-ChildItem -Path (Join-Path $backend "*\target\surefire-reports\TEST-*.xml") | ForEach-Object {
        [xml]$xml = Get-Content $_.FullName
        $total += [int]$xml.testsuite.tests
        $fallos += [int]$xml.testsuite.failures
        $errores += [int]$xml.testsuite.errors
        $omitidas += [int]$xml.testsuite.skipped
    }
    Write-Host ""
    Write-Host "Pruebas ejecutadas: $total | fallos: $fallos | errores: $errores | omitidas: $omitidas"

    if ($total -lt $MinimoPruebas) { Write-Error "No se encontraron reportes de pruebas"; exit 2 }
    if ($omitidas -gt 0) { Write-Error "Hay $omitidas pruebas omitidas: la verificación completa no es válida"; exit 3 }
    if ($fallos -gt 0 -or $errores -gt 0) { Write-Error "Hay pruebas fallidas"; exit 4 }
    Write-Host "Verificación completa de backend: OK"
}
finally {
    Limpiar
}
