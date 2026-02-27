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

# 启动Redis隧道
Write-Host "Starting Redis tunnel..." -ForegroundColor Cyan
try {
    # 检查是否已经有隧道在运行
    $existingTunnel = Get-Process | Where-Object { $_.ProcessName -eq "ssh" }
    if ($existingTunnel) {
        Write-Host "SSH process already running." -ForegroundColor Green
    } else {
        # 启动新的隧道
        Write-Host "Creating Redis tunnel to server..." -ForegroundColor Cyan
        # 检查logs目录是否存在
        if (-not (Test-Path "$ProjectRoot\logs")) {
            New-Item -ItemType Directory -Path "$ProjectRoot\logs" -Force | Out-Null
            Write-Host "Created logs directory." -ForegroundColor Gray
        }
        # 使用Start-Process启动SSH隧道，-NoNewWindow参数确保在后台运行
        Write-Host "Executing: ssh -L 16379:localhost:6379 root@47.243.222.131" -ForegroundColor Gray
        Start-Process -FilePath "ssh" -ArgumentList "-L", "16379:localhost:6379", "root@47.243.222.131", "-N" -NoNewWindow -RedirectStandardOutput "$ProjectRoot\logs\redis-tunnel.log" -RedirectStandardError "$ProjectRoot\logs\redis-tunnel-error.log"
        # 等待隧道建立
        Start-Sleep -Seconds 5
        # 再次检查SSH进程
        $newTunnel = Get-Process | Where-Object { $_.ProcessName -eq "ssh" }
        if ($newTunnel) {
            Write-Host "Redis tunnel started successfully." -ForegroundColor Green
        } else {
            Write-Host "Warning: Redis tunnel process not found. Check logs for details." -ForegroundColor Yellow
        }
    }
} catch {
    Write-Host "Error starting Redis tunnel: $($_.Exception.Message)" -ForegroundColor Red
    Write-Host "API will continue to run, but Redis features may be unavailable." -ForegroundColor Yellow
}

Set-Location $ProjectRoot
Write-Host "Starting API (bootRun)..." -ForegroundColor Cyan
$ApiDir = Join-Path $ProjectRoot "apps\api"
try {
    & $GradlePath -p $ApiDir bootRun --no-daemon
} finally {
    # 当API服务停止时，清理Redis隧道
    Write-Host "Stopping API service..." -ForegroundColor Cyan
    try {
        # 查找并停止Redis隧道进程
        $tunnelProcess = Get-Process | Where-Object { $_.ProcessName -eq "ssh" -and $_.MainWindowTitle -like "*16379:localhost:6379*" }
        if ($tunnelProcess) {
            Write-Host "Stopping Redis tunnel..." -ForegroundColor Cyan
            $tunnelProcess | Stop-Process -Force
            Write-Host "Redis tunnel stopped." -ForegroundColor Green
        }
    } catch {
        Write-Host "Warning: Failed to stop Redis tunnel: $($_.Exception.Message)" -ForegroundColor Yellow
    }
}

