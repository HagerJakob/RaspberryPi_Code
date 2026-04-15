param(
    [string]$OutputName = "obd-dashboard-wails"
)

$ErrorActionPreference = "Stop"

if (-not (Get-Command go -ErrorAction SilentlyContinue)) {
    throw "Go CLI not found. Install Go 1.21+ before building."
}

$env:GOOS = "linux"
$env:GOARCH = "arm64"
$env:CGO_ENABLED = "0"

go mod tidy
go build -trimpath -ldflags "-s -w" -o $OutputName .

Write-Host "Built Linux ARM64 binary: $OutputName"
