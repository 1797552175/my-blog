# Local start API: load env from config/env.local then bootRun
# Run from project root: .\my-blog\scripts\start-api.ps1
# Run from my-blog:      .\scripts\start-api.ps1

$ErrorActionPreference = "Stop"
$ProjectRoot = Split-Path $PSScriptRoot -Parent
$EnvFile = Join-Path $ProjectRoot "config\env.local"
$GradlePath = Join-Path $ProjectRoot "apps\api\gradlew.bat"

if (-not (Test-Path $EnvFile)) {
    Write-Host "config/env.local not found. Copy config/env.example to config/env.local and fill in." -ForegroundColor Yellow
    Write-Host "Path: $EnvFile" -ForegroundColor Gray
    exit 1
}

Write-Host "Loading env from config/env.local..." -ForegroundColor Cyan
$content = Get-Content $EnvFile -Encoding UTF8
if ($content) {
    foreach ($line in $content) {
        $line = $line.Trim()
        if ($line -and -not $line.StartsWith("#")) {
            $idx = $line.IndexOf("=")
            if ($idx -gt 0) {
                $key = $line.Substring(0, $idx).Trim()
                $value = $line.Substring($idx + 1).Trim()
                if ($value.Length -ge 2 -and $value[0] -eq '"' -and $value[-1] -eq '"') { $value = $value.Substring(1, $value.Length - 2) }
                if ($value.Length -ge 2 -and $value[0] -eq "'" -and $value[-1] -eq "'") { $value = $value.Substring(1, $value.Length - 2) }
                Set-Item -Path "Env:$key" -Value $value -Force
            }
        }
    }
}

if (-not $env:JAVA_HOME) {
    Write-Host "JAVA_HOME not set. Set it in config/env.local or system." -ForegroundColor Yellow
}
if ($env:JAVA_HOME) {
    $env:PATH = "$env:JAVA_HOME\bin;$env:PATH"
}

if (-not $env:DB_USER -or -not $env:DB_PASSWORD) {
    Write-Host "Warning: DB_USER or DB_PASSWORD not set. Check config/env.local" -ForegroundColor Yellow
}
else {
    Write-Host "Loaded DB_USER=$env:DB_USER, DB_HOST=$env:DB_HOST, DB_PORT=$env:DB_PORT" -ForegroundColor Gray
}

Set-Location $ProjectRoot
Write-Host "Starting API (bootRun)..." -ForegroundColor Cyan
$ApiDir = Join-Path $ProjectRoot "apps\api"
& $GradlePath -p $ApiDir bootRun --no-daemon
