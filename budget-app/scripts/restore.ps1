<#
.SYNOPSIS
    Restaure la base BudgetDb depuis un fichier .bak du dossier ./backups.
    ATTENTION : remplace intégralement les données de la base ciblée.
.EXAMPLE
    .\scripts\restore.ps1 -File BudgetDb_auto_20260612_030000.bak          # restaure la PROD (confirmation demandée)
    .\scripts\restore.ps1 -File BudgetDb_manuel_20260612_180000.bak -Env dev  # copie un backup (ex. de prod) dans la stack DEV
#>
param(
    [Parameter(Mandatory = $true)]
    [string]$File,
    [ValidateSet('prod', 'dev')]
    [string]$Env = 'prod',
    [switch]$Force
)

$ErrorActionPreference = 'Stop'

$dbContainer  = if ($Env -eq 'prod') { 'budget-db' }  else { 'budget-db-dev' }
$apiContainer = if ($Env -eq 'prod') { 'budget-api' } else { 'budget-api-dev' }
$password = 'Budget@pp2026!'  # doit correspondre à MSSQL_SA_PASSWORD du docker-compose

$backupsDir = Join-Path (Split-Path $PSScriptRoot -Parent) 'backups'
$name = Split-Path $File -Leaf
if (-not (Test-Path (Join-Path $backupsDir $name))) {
    $disponibles = (Get-ChildItem $backupsDir -Filter *.bak | Sort-Object Name | Select-Object -ExpandProperty Name) -join "`n  "
    throw "Fichier introuvable : $backupsDir\$name`nSauvegardes disponibles :`n  $disponibles"
}

if ($Env -eq 'prod' -and -not $Force) {
    $reponse = Read-Host "Cette opération va ÉCRASER la base de PROD avec $name. Continuer ? (oui/non)"
    if ($reponse -ne 'oui') { Write-Host 'Restauration annulée.'; exit 0 }
}

Write-Host "Arrêt de l'API ($apiContainer)..."
docker stop $apiContainer | Out-Null

# SINGLE_USER coupe les connexions restantes ; WITH REPLACE écrase la base existante.
$sql = "IF DB_ID('BudgetDb') IS NOT NULL ALTER DATABASE [BudgetDb] SET SINGLE_USER WITH ROLLBACK IMMEDIATE; " +
       "RESTORE DATABASE [BudgetDb] FROM DISK = '/var/opt/mssql/backup/$name' WITH REPLACE; " +
       "ALTER DATABASE [BudgetDb] SET MULTI_USER;"
docker exec $dbContainer /opt/mssql-tools18/bin/sqlcmd -S localhost -U sa -P $password -C -b -Q $sql
$restoreOk = $LASTEXITCODE -eq 0

Write-Host "Redémarrage de l'API ($apiContainer)..."
docker start $apiContainer | Out-Null

if (-not $restoreOk) {
    throw "La restauration a échoué. Si la base est restée en SINGLE_USER : docker exec $dbContainer /opt/mssql-tools18/bin/sqlcmd -S localhost -U sa -P '<mdp>' -C -Q `"ALTER DATABASE [BudgetDb] SET MULTI_USER`""
}
Write-Host "Base $Env restaurée depuis $name."
