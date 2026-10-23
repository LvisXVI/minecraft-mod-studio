using System;
using System.Collections.Generic;
using System.Diagnostics;
using System.IO;
using System.Text;
using System.Text.RegularExpressions;

internal static class InstallCleanup
{
    private static readonly Regex VersionDirectory = new Regex(@"^\d+\.\d+\.\d+(?:-[0-9A-Za-z.-]+)?$", RegexOptions.CultureInvariant);

    public static void CleanupPreviousVersions(string baseDirectory, string currentDirectory)
    {
        string root = Path.GetFullPath(baseDirectory).TrimEnd(Path.DirectorySeparatorChar, Path.AltDirectorySeparatorChar);
        string current = Path.GetFullPath(currentDirectory).TrimEnd(Path.DirectorySeparatorChar, Path.AltDirectorySeparatorChar);
        if (!String.Equals(Path.GetDirectoryName(current), root, StringComparison.OrdinalIgnoreCase))
            throw new InvalidOperationException("Der aktuelle Mod-Studio-Ordner muss direkt im Installationsverzeichnis liegen.");
        if (!Directory.Exists(root)) return;

        var obsolete = new List<string>();
        foreach (string directory in Directory.GetDirectories(root))
        {
            string full = Path.GetFullPath(directory).TrimEnd(Path.DirectorySeparatorChar, Path.AltDirectorySeparatorChar);
            string name = Path.GetFileName(full);
            if (String.Equals(full, current, StringComparison.OrdinalIgnoreCase) || !VersionDirectory.IsMatch(name)) continue;
            try
            {
                if ((File.GetAttributes(full) & FileAttributes.ReparsePoint) != 0) continue;
                obsolete.Add(full);
            }
            catch { }
        }
        if (obsolete.Count == 0) return;

        var activeProcessIds = new List<int>();
        foreach (Process process in Process.GetProcesses())
        {
            try
            {
                string executable = Path.GetFullPath(process.MainModule.FileName);
                foreach (string directory in obsolete)
                {
                    string prefix = directory + Path.DirectorySeparatorChar;
                    if (executable.StartsWith(prefix, StringComparison.OrdinalIgnoreCase))
                    {
                        activeProcessIds.Add(process.Id);
                        break;
                    }
                }
            }
            catch { }
            finally { process.Dispose(); }
        }

        if (activeProcessIds.Count == 0)
        {
            foreach (string directory in obsolete) TryDelete(directory);
            return;
        }

        ScheduleDeferredCleanup(root, obsolete, activeProcessIds);
    }

    private static void TryDelete(string directory)
    {
        try { Directory.Delete(directory, true); }
        catch { }
    }

    private static void ScheduleDeferredCleanup(string root, List<string> directories, List<int> processIds)
    {
        try
        {
            var script = new StringBuilder();
            script.Append("$ErrorActionPreference='SilentlyContinue';Wait-Process -Id @(");
            for (int i = 0; i < processIds.Count; i++)
            {
                if (i > 0) script.Append(',');
                script.Append(processIds[i]);
            }
            script.Append(") -ErrorAction SilentlyContinue;$root=").Append(QuotePowerShell(root));
            script.Append(";$pattern='^\\d+\\.\\d+\\.\\d+(?:-[0-9A-Za-z.-]+)?$';$targets=@(");
            for (int i = 0; i < directories.Count; i++)
            {
                if (i > 0) script.Append(',');
                script.Append(QuotePowerShell(directories[i]));
            }
            script.Append(");foreach($target in $targets){try{$full=[IO.Path]::GetFullPath($target);if([IO.Path]::GetDirectoryName($full) -ine $root){continue};if([IO.Path]::GetFileName($full) -notmatch $pattern){continue};$item=Get-Item -LiteralPath $full -Force;if($item.Attributes -band [IO.FileAttributes]::ReparsePoint){continue};Remove-Item -LiteralPath $full -Recurse -Force}catch{}};");
            string encoded = Convert.ToBase64String(Encoding.Unicode.GetBytes(script.ToString()));
            var start = new ProcessStartInfo
            {
                FileName = Path.Combine(Environment.SystemDirectory, "WindowsPowerShell", "v1.0", "powershell.exe"),
                Arguments = "-NoProfile -NonInteractive -WindowStyle Hidden -ExecutionPolicy Bypass -EncodedCommand " + encoded,
                UseShellExecute = false,
                CreateNoWindow = true,
                WindowStyle = ProcessWindowStyle.Hidden
            };
            Process.Start(start);
        }
        catch { }
    }

    private static string QuotePowerShell(string value) { return "'" + value.Replace("'", "''") + "'"; }
}
