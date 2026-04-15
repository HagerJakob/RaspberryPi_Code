param(
    [string]$FrontendDir = "..\frontend",
    [string]$EmbedDistDir = ".\frontend\dist"
)

$ErrorActionPreference = "Stop"

$frontendPath = (Resolve-Path $FrontendDir).ProviderPath
$embedPath = Resolve-Path (Split-Path $EmbedDistDir -Parent) -ErrorAction SilentlyContinue
if (-not $embedPath) {
    New-Item -ItemType Directory -Path (Split-Path $EmbedDistDir -Parent) -Force | Out-Null
}

if (-not (Test-Path (Join-Path $frontendPath "package.json"))) {
    throw "No package.json found in frontend directory: $frontendPath"
}

Push-Location $frontendPath
try {
    $built = $false
    if (Get-Command bun -ErrorAction SilentlyContinue) {
        try {
            bun run build
            $built = $true
        } catch {
            Write-Warning "bun build failed, falling back to npm"
        }
    }

    if (-not $built) {
        if (Get-Command npm -ErrorAction SilentlyContinue) {
            npm run build
            $built = $true
        } else {
            throw "Neither bun nor npm is available to build frontend"
        }
    }
} finally {
    Pop-Location
}

if (-not (Test-Path (Join-Path $frontendPath "dist"))) {
    throw "Frontend build did not create dist directory in $frontendPath"
}

if (Test-Path $EmbedDistDir) {
    Remove-Item -Recurse -Force $EmbedDistDir
}

Copy-Item -Recurse -Force (Join-Path $frontendPath "dist") $EmbedDistDir
Write-Host "Frontend build synced to $EmbedDistDir"
