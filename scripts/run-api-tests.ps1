#!/usr/bin/env pwsh

<#
.SYNOPSIS
    API 自动化测试脚本

.DESCRIPTION
    运行 API 自动化测试，支持多种模式和测试类型

.PARAMETER Report
    生成详细的 Markdown 报告

.PARAMETER CI
    CI 模式，测试失败时返回非零退出码

.PARAMETER Watch
    监视模式，服务启动后持续运行测试

.PARAMETER Complete
    运行完整测试（api-test-complete.js），否则运行快速测试（api-test.js）

.PARAMETER Seed
    先运行数据生成再执行测试

.PARAMETER JUnit
    生成 JUnit XML 报告（指定输出路径）

.PARAMETER BaseUrl
    指定 API 基础 URL

.PARAMETER MaxWait
    监视模式下的最大等待时间（秒），默认 300（5分钟）

.EXAMPLE
    .\run-api-tests.ps1
    运行快速冒烟测试

.EXAMPLE
    .\run-api-tests.ps1 -Complete
    运行完整回归测试

.EXAMPLE
    .\run-api-tests.ps1 -Complete -Seed
    先运行数据生成，再执行完整测试

.EXAMPLE
    .\run-api-tests.ps1 -Report -Complete
    运行完整测试并生成报告

.EXAMPLE
    .\run-api-tests.ps1 -BaseUrl "http://localhost:8081"
    指定不同的端口运行测试

.EXAMPLE
    .\run-api-tests.ps1 -Watch -MaxWait 600
    监视模式，最多等待10分钟
#>

param(
    [switch]$Report,
    [switch]$CI,
    [switch]$Watch,
    [switch]$Complete,
    [switch]$Seed,
    [string]$JUnit,
    [string]$BaseUrl = "http://localhost:8080",
    [int]$MaxWait = 300
)

$ErrorActionPreference = "Stop"

# 颜色定义
$Colors = @{
    Success = "Green"
    Error = "Red"
    Warning = "Yellow"
    Info = "Cyan"
}

function Write-ColorOutput {
    param(
        [string]$Message,
        [string]$Color = "White"
    )
    Write-Host $Message -ForegroundColor $Colors[$Color]
}

# 检查 Node.js
function Test-NodeJs {
    try {
        $nodeVersion = node --version
        Write-ColorOutput "✓ Node.js 已安装: $nodeVersion" "Success"
        return $true
    } catch {
        Write-ColorOutput "✗ Node.js 未安装，请先安装 Node.js" "Error"
        return $false
    }
}

# 检查服务是否运行
function Test-ApiService {
    param([string]$Url)
    
    try {
        $response = Invoke-RestMethod -Uri "$Url/api/health" -Method GET -TimeoutSec 5
        if ($response.status -eq "ok") {
            return $true
        }
    } catch {
        return $false
    }
    return $false
}

# 等待服务启动
function Wait-ForApiService {
    param(
        [string]$Url,
        [int]$TimeoutSeconds
    )
    
    $startTime = Get-Date
    $waitInterval = 5  # 每5秒检查一次
    $nextLogTime = $startTime
    
    Write-ColorOutput "⏳ 等待 API 服务启动..." "Warning"
    
    while ($true) {
        $elapsed = ((Get-Date) - $startTime).TotalSeconds
        
        if (Test-ApiService -Url $Url) {
            Write-ColorOutput "✓ API 服务已启动" "Success"
            return $true
        }
        
        if ($elapsed -ge $TimeoutSeconds) {
            Write-ColorOutput "✗ 等待超时 (${TimeoutSeconds}秒)，API 服务未启动" "Error"
            Write-ColorOutput "  请先启动服务: cd apps/api && ../../gradlew bootRun --args='--spring.profiles.active=h2'" "Warning"
            return $false
        }
        
        # 每10秒输出一次等待信息
        if ((Get-Date) -ge $nextLogTime) {
            $remaining = [math]::Ceiling($TimeoutSeconds - $elapsed)
            Write-ColorOutput "  等待中... 已等待 ${elapsed:N0}秒，剩余 ${remaining}秒" "Info"
            $nextLogTime = (Get-Date).AddSeconds(10)
        }
        
        Start-Sleep -Seconds $waitInterval
    }
}

# 主函数
function Main {
    $testType = if ($Complete) { "完整回归测试" } else { "快速冒烟测试" }
    $testScript = if ($Complete) { "api-test-complete.js" } else { "api-test.js" }
    
    Write-ColorOutput "🚀 API 自动化测试 - $testType" "Info"
    Write-ColorOutput "==================" "Info"
    Write-ColorOutput ""

    # 检查 Node.js
    if (-not (Test-NodeJs)) {
        exit 1
    }

    # 检查或等待服务
    if ($Watch) {
        if (-not (Wait-ForApiService -Url $BaseUrl -TimeoutSeconds $MaxWait)) {
            exit 1
        }
    } else {
        if (-not (Test-ApiService -Url $BaseUrl)) {
            Write-ColorOutput "✗ API 服务未运行或无法访问: $BaseUrl" "Error"
            Write-ColorOutput "  请先启动服务: cd apps/api && ../../gradlew bootRun --args='--spring.profiles.active=h2'" "Warning"
            Write-ColorOutput "  或使用 -Watch 参数等待服务启动" "Info"
            exit 1
        }
        Write-ColorOutput "✓ API 服务运行正常: $BaseUrl" "Success"
    }

    Write-ColorOutput ""
    Write-ColorOutput "📍 Base URL: $BaseUrl" "Info"
    Write-ColorOutput "📝 Test Script: $testScript" "Info"
    Write-ColorOutput ""

    # 构建参数
    $arguments = @()
    if ($Report) { $arguments += "--report" }
    if ($CI) { $arguments += "--ci" }
    if ($Seed) { $arguments += "--seed" }
    if ($JUnit) { $arguments += "--junit=$JUnit" }

    # 设置环境变量
    $env:API_BASE_URL = $BaseUrl

    # 运行测试
    try {
        if ($Watch) {
            Write-ColorOutput "👀 监视模式 - 按 Ctrl+C 停止" "Warning"
            $testCount = 0
            while ($true) {
                $testCount++
                Clear-Host
                Write-ColorOutput "🚀 API 自动化测试 (监视模式 - 第 $testCount 次)" "Info"
                Write-ColorOutput "==================" "Info"
                Write-ColorOutput ""
                
                if (Test-ApiService -Url $BaseUrl) {
                    node $testScript @arguments
                    $exitCode = $LASTEXITCODE
                    
                    if ($exitCode -ne 0 -and $CI) {
                        Write-ColorOutput "❌ 测试失败，退出监视模式" "Error"
                        exit $exitCode
                    }
                } else {
                    Write-ColorOutput "⚠️  API 服务不可用，跳过本次测试" "Warning"
                }
                
                Write-ColorOutput ""
                Write-ColorOutput "下一次测试将在 10 秒后运行..." "Info"
                Start-Sleep -Seconds 10
            }
        } else {
            node $testScript @arguments
            exit $LASTEXITCODE
        }
    } catch {
        Write-ColorOutput "测试执行失败: $_" "Error"
        exit 1
    }
}

# 运行主函数
Main
