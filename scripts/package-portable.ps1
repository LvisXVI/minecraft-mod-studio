$ErrorActionPreference = 'Stop'
function Get-Sha256Hex([string] $path) {
    $stream = [System.IO.File]::OpenRead($path)
    $sha = [System.Security.Cryptography.SHA256]::Create()
    try { return [System.BitConverter]::ToString($sha.ComputeHash($stream)).Replace('-', '').ToLowerInvariant() }
    finally { $sha.Dispose(); $stream.Dispose() }
}
$root = [System.IO.Path]::GetFullPath((Split-Path -Parent $PSScriptRoot))
$launcher = Join-Path $root 'Mod-Studio.exe'
& (Join-Path $PSScriptRoot 'build-launcher.ps1')
$downloads = Join-Path $root '.runtime\downloads'
$required = @('node-v24.21.0-win-x64.zip', 'temurin-jdk-25-windows-x64.zip', 'gradle-9.8.2-bin.zip')
foreach ($name in $required) {
    if (-not (Test-Path -LiteralPath (Join-Path $downloads $name))) { throw "Runtime-Archiv fehlt: $name" }
}
$dist = Join-Path $root 'dist'
New-Item -ItemType Directory -Force -Path $dist | Out-Null
$archive = Join-Path $dist 'Mod-Studio-Portable.zip'
if (Test-Path -LiteralPath $archive) { [System.IO.File]::Delete($archive) }
$entries = @(
    (Join-Path $root 'README.md'),
    (Join-Path $root 'package.json'),
    $launcher,
    (Join-Path $root 'start-mod-studio.bat'),
    (Join-Path $root 'scripts'),
    (Join-Path $root 'server'),
    (Join-Path $root 'public'),
    (Join-Path $root 'licenses'),
    (Join-Path $root 'docs'),
    (Join-Path $root '.runtime')
)
Compress-Archive -Path $entries -DestinationPath $archive -CompressionLevel Fastest
$digest = Get-Sha256Hex $archive
Set-Content -LiteralPath (Join-Path $dist 'SHA256SUMS.txt') -Value "$digest  Mod-Studio-Portable.zip" -Encoding ascii
Get-Item -LiteralPath $archive | Select-Object FullName,Length
Write-Host "SHA-256: $digest"
