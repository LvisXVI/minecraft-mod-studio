$ErrorActionPreference = 'Stop'
function Get-Sha256Hex([string] $path) {
    $stream = [System.IO.File]::OpenRead($path)
    $sha = [System.Security.Cryptography.SHA256]::Create()
    try { return [System.BitConverter]::ToString($sha.ComputeHash($stream)).Replace('-', '').ToLowerInvariant() }
    finally { $sha.Dispose(); $stream.Dispose() }
}
$root = [System.IO.Path]::GetFullPath((Split-Path -Parent $PSScriptRoot))
$runtimeRoot = Join-Path $root '.runtime'
$downloads = Join-Path $runtimeRoot 'downloads'
$runtimes = @(
    @{ Zip = (Join-Path $downloads 'node-v24.21.0-win-x64.zip'); Destination = (Join-Path $runtimeRoot 'node'); Executable = (Join-Path $runtimeRoot 'node\node-v24.21.0-win-x64\node.exe'); Sha256 = '158f7685b44de51f6c0df1d153526cbcd3e1bc739a8dfc607721cef75de9e541' },
    @{ Zip = (Join-Path $downloads 'temurin-jdk-25-windows-x64.zip'); Destination = (Join-Path $runtimeRoot 'jdk'); Executable = (Join-Path $runtimeRoot 'jdk\jdk-25.0.4.1+1\bin\javac.exe'); Sha256 = '00c847d804f4a78e9f04f2683faf14fed898535b177b7fc704486cb0284e9283' },
    @{ Zip = (Join-Path $downloads 'gradle-9.8.2-bin.zip'); Destination = (Join-Path $runtimeRoot 'gradle'); Executable = (Join-Path $runtimeRoot 'gradle\gradle-9.8.2\bin\gradle.bat'); Sha256 = '21bd5da2de49b642904077f38c0efdc7778e92b3ed0889392dca61b97e389607' }
)
foreach ($runtime in $runtimes) {
    if (-not (Test-Path -LiteralPath $runtime.Executable)) {
        Write-Host "Bereite eingebettete Laufzeit vor: $(Split-Path $runtime.Destination -Leaf)" -ForegroundColor Cyan
        $actual = Get-Sha256Hex $runtime.Zip
        if ($actual -ne $runtime.Sha256) { throw "Laufzeitarchiv ist beschädigt: $($runtime.Zip)" }
        Expand-Archive -LiteralPath $runtime.Zip -DestinationPath $runtime.Destination -Force
    }
}
$node = $runtimes[0].Executable
$env:JAVA_HOME = Join-Path $runtimeRoot 'jdk\jdk-25.0.4.1+1'
$env:PATH = (Join-Path $env:JAVA_HOME 'bin') + ';' + $env:PATH
$env:GRADLE_USER_HOME = Join-Path $env:LOCALAPPDATA 'ModStudio\gradle-cache'
Write-Host 'Mod Studio startet. Das Fenster offen lassen, solange du die Website verwendest.' -ForegroundColor Green
& $node (Join-Path $root 'server\index.js')
