$ErrorActionPreference = 'Stop'
$root = [System.IO.Path]::GetFullPath((Split-Path -Parent $PSScriptRoot))
$source = @'
using System;
using System.Diagnostics;
using System.IO;
using System.Windows.Forms;

internal static class ModStudioLauncher
{
    [STAThread]
    private static int Main()
    {
        string root = AppDomain.CurrentDomain.BaseDirectory;
        string script = Path.Combine(root, "scripts", "start-mod-studio.ps1");
        if (!File.Exists(script))
        {
            MessageBox.Show("Mod Studio ist unvollständig. Bitte entpacke zuerst das vollständige Portable-Paket.", "Mod Studio", MessageBoxButtons.OK, MessageBoxIcon.Error);
            return 1;
        }

        var start = new ProcessStartInfo
        {
            FileName = Path.Combine(Environment.GetFolderPath(Environment.SpecialFolder.System), "WindowsPowerShell\\v1.0\\powershell.exe"),
            Arguments = "-NoLogo -NoProfile -ExecutionPolicy Bypass -File \"" + script + "\"",
            WorkingDirectory = root,
            UseShellExecute = true,
            CreateNoWindow = false
        };
        Process.Start(start);
        return 0;
    }
}
'@
$output = Join-Path $root 'Mod-Studio.exe'
Add-Type -TypeDefinition $source -Language CSharp -OutputType WindowsApplication -OutputAssembly $output -ReferencedAssemblies 'System.Windows.Forms.dll'
Write-Host "Launcher erstellt: $output"
