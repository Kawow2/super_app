<#
.SYNOPSIS
    Sauvegarde manuelle et immédiate de la base BudgetDb dans le dossier ./backups.
.EXAMPLE
    .\scripts\backup.ps1            # sauvegarde la prod
    .\scripts\backup.ps1 -Env dev   # sauvegarde la base de la stack dev
#>
param(
    [ValidateSet('prod', 'dev')]
    [string]$Env = 'prod'
)

$ErrorActionPreference = 'Stop'

$dbContainer = if ($Env -eq 'prod') { 'budget-db' } else { 'budget-db-dev' }
$password = 'Budget@pp2026!'  # doit correspondre à MSSQL_SA_PASSWORD du docker-compose
$stamp = Get-Date -Format 'yyyyMMdd_HHmmss'
$file = "BudgetDb_manuel_$stamp.bak"

Write-Host "Sauvegarde de BudgetDb ($Env) vers backups\$file ..."
docker exec $dbContainer /opt/mssql-tools18/bin/sqlcmd -S localhost -U sa -P $password -C -b `
    -Q "BACKUP DATABASE [BudgetDb] TO DISK = '/var/opt/mssql/backup/$file' WITH INIT"
if ($LASTEXITCODE -ne 0) { throw "La sauvegarde a échoué (conteneur $dbContainer)." }

$path = Join-Path (Split-Path $PSScriptRoot -Parent) "backups\$file"
Write-Host "Sauvegarde terminée : $path"
