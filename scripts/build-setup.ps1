param(
    [Parameter(Mandatory = $true)][string] $PortableArchive,
    [Parameter(Mandatory = $true)][string] $OutputPath
)
$ErrorActionPreference = 'Stop'
$ui = Get-Content -LiteralPath (Join-Path $PSScriptRoot 'launcher-ui.cs') -Raw -Encoding UTF8
$source = @'
internal static class ModStudioSetup
{
    private static LoadingForm splash;
    private static string setupPath;

    [STAThread]
    private static void Main()
    {
        System.Windows.Forms.Application.EnableVisualStyles();
        System.Windows.Forms.Application.SetCompatibleTextRenderingDefault(false);
        setupPath = System.Reflection.Assembly.GetExecutingAssembly().Location;
        splash = new LoadingForm("Mod Studio wird installiert");
        splash.Shown += (sender, e) => splash.PlayOpeningAnimation();
        splash.Shown += (sender, e) => System.Threading.Tasks.Task.Run((System.Action)Install);
        System.Windows.Forms.Application.Run(splash);
    }

    private static void Install()
    {
        string baseDirectory = System.IO.Path.Combine(System.Environment.GetFolderPath(System.Environment.SpecialFolder.LocalApplicationData), "Programs", "ModStudio");
        string installDirectory = System.IO.Path.Combine(baseDirectory, "__INSTALL_VERSION__");
        string stagingDirectory = System.IO.Path.Combine(baseDirectory, ".install-" + System.Guid.NewGuid().ToString("N"));
        string archivePath = System.IO.Path.Combine(System.IO.Path.GetTempPath(), "ModStudio-" + System.Guid.NewGuid().ToString("N") + ".zip");
        try
        {
            string installedLauncher = System.IO.Path.Combine(installDirectory, "Mod-Studio.exe");
            if (System.IO.File.Exists(installedLauncher)) { Launch(installedLauncher, installDirectory); return; }
            if (System.IO.Directory.Exists(installDirectory)) throw new System.InvalidOperationException("Der Installationsordner ist unvollständig. Entferne den Ordner " + installDirectory + " und starte die Setup-Datei erneut.");
            System.IO.Directory.CreateDirectory(baseDirectory);
            splash.SetProgress(2, "Installationspaket wird geprüft.");
            using (var input = System.IO.File.OpenRead(setupPath))
            {
                if (input.Length < 16) throw new System.IO.InvalidDataException("Die Setup-Datei enthält kein vollständiges App-Paket.");
                input.Seek(-8, System.IO.SeekOrigin.End);
                byte[] footer = new byte[8];
                if (input.Read(footer, 0, footer.Length) != footer.Length) throw new System.IO.InvalidDataException("Die Setup-Datei ist beschädigt.");
                long archiveLength = System.BitConverter.ToInt64(footer, 0);
                long archiveOffset = input.Length - 8 - archiveLength;
                if (archiveLength <= 0 || archiveOffset <= 0) throw new System.IO.InvalidDataException("Das eingebettete App-Paket ist ungültig.");
                input.Position = archiveOffset;
                using (var output = System.IO.File.Create(archivePath))
                {
                    byte[] buffer = new byte[1024 * 1024]; long remaining = archiveLength;
                    while (remaining > 0)
                    {
                        int read = input.Read(buffer, 0, (int)System.Math.Min(buffer.Length, remaining));
                        if (read <= 0) throw new System.IO.EndOfStreamException("Das App-Paket ist unvollständig.");
                        output.Write(buffer, 0, read); remaining -= read;
                        splash.SetProgress(2 + (int)((archiveLength - remaining) * 8 / archiveLength), "Installationspaket wird vorbereitet.");
                    }
                }
            }

            System.IO.Directory.CreateDirectory(stagingDirectory);
            ExtractWithProgress(archivePath, stagingDirectory);
            string launcher = System.IO.Path.Combine(stagingDirectory, "Mod-Studio.exe");
            string server = System.IO.Path.Combine(stagingDirectory, "server", "index.js");
            if (!System.IO.File.Exists(launcher) || !System.IO.File.Exists(server)) throw new System.IO.InvalidDataException("Das App-Paket ist unvollständig.");
            splash.SetProgress(96, "Installation wird abgeschlossen.");
            System.IO.Directory.Move(stagingDirectory, installDirectory);
            splash.SetProgress(100, "Mod Studio wird gestartet.");
            Launch(System.IO.Path.Combine(installDirectory, "Mod-Studio.exe"), installDirectory);
        }
        catch (System.Exception error)
        {
            if (splash.IsHandleCreated) splash.BeginInvoke(new System.Action(() => {
                splash.Show(); splash.Activate(); splash.SetProgress(0, "Installation fehlgeschlagen.");
                System.Windows.Forms.MessageBox.Show("Mod Studio konnte nicht installiert werden.\r\n\r\n" + error.Message, "Mod Studio Setup", System.Windows.Forms.MessageBoxButtons.OK, System.Windows.Forms.MessageBoxIcon.Error);
                System.Windows.Forms.Application.Exit();
            }));
        }
        finally
        {
            try { if (System.IO.File.Exists(archivePath)) System.IO.File.Delete(archivePath); } catch { }
            try { if (System.IO.Directory.Exists(stagingDirectory)) System.IO.Directory.Delete(stagingDirectory, true); } catch { }
        }
    }

    private static void ExtractWithProgress(string archive, string destination)
    {
        string root = System.IO.Path.GetFullPath(destination).TrimEnd(System.IO.Path.DirectorySeparatorChar) + System.IO.Path.DirectorySeparatorChar;
        using (var input = System.IO.File.OpenRead(archive))
        using (var zip = new System.IO.Compression.ZipArchive(input, System.IO.Compression.ZipArchiveMode.Read))
        {
            long total = 0; foreach (var entry in zip.Entries) total += entry.Length;
            long complete = 0; byte[] buffer = new byte[256 * 1024];
            foreach (var entry in zip.Entries)
            {
                string target = System.IO.Path.GetFullPath(System.IO.Path.Combine(root, entry.FullName.Replace('/', System.IO.Path.DirectorySeparatorChar)));
                if (!target.StartsWith(root, System.StringComparison.OrdinalIgnoreCase)) throw new System.IO.InvalidDataException("Das App-Paket enthält einen ungültigen Dateipfad.");
                if (System.String.IsNullOrEmpty(entry.Name)) { System.IO.Directory.CreateDirectory(target); continue; }
                System.IO.Directory.CreateDirectory(System.IO.Path.GetDirectoryName(target));
                using (var source = entry.Open()) using (var output = System.IO.File.Create(target))
                {
                    int read;
                    while ((read = source.Read(buffer, 0, buffer.Length)) > 0)
                    {
                        output.Write(buffer, 0, read); complete += read;
                        if (total == 0 || complete % (4 * 1024 * 1024) < buffer.Length || complete >= total)
                        {
                            int progress = total == 0 ? 95 : 10 + (int)(complete * 85 / total);
                            splash.SetProgress(progress, "App-Dateien werden installiert.");
                        }
                    }
                }
            }
        }
    }

    private static void Launch(string launcher, string workingDirectory)
    {
        System.Diagnostics.Process.Start(new System.Diagnostics.ProcessStartInfo { FileName = launcher, WorkingDirectory = workingDirectory, UseShellExecute = true });
        if (splash.IsHandleCreated) splash.BeginInvoke(new System.Action(() => { splash.SetProgress(100, "Fertig."); splash.Close(); }));
    }
}
'@

$output = [System.IO.Path]::GetFullPath($OutputPath)
$archive = [System.IO.Path]::GetFullPath($PortableArchive)
$root = [System.IO.Path]::GetFullPath((Split-Path -Parent $PSScriptRoot))
$version = (Get-Content -LiteralPath (Join-Path $root 'package.json') -Raw -Encoding UTF8 | ConvertFrom-Json).version
if ($version -notmatch '^\d+\.\d+\.\d+(?:-[0-9A-Za-z.-]+)?$') { throw "Ungültige App-Version: $version" }
$source = $source.Replace('__INSTALL_VERSION__', $version)
if (-not (Test-Path -LiteralPath $archive -PathType Leaf)) { throw "Portable-Paket fehlt: $archive" }
New-Item -ItemType Directory -Force -Path (Split-Path -Parent $output) | Out-Null
if (Test-Path -LiteralPath $output) { [System.IO.File]::Delete($output) }
$compiler = Join-Path $env:WINDIR 'Microsoft.NET\Framework64\v4.0.30319\csc.exe'
if (-not (Test-Path -LiteralPath $compiler)) { $compiler = Join-Path $env:WINDIR 'Microsoft.NET\Framework\v4.0.30319\csc.exe' }
if (-not (Test-Path -LiteralPath $compiler)) { throw 'Der Windows-.NET-Compiler wurde nicht gefunden.' }
$sourcePath = Join-Path $env:TEMP 'mod-studio-setup-build.cs'
[System.IO.File]::WriteAllText($sourcePath, $ui + $source, [System.Text.UTF8Encoding]::new($true))
& $compiler /nologo /codepage:65001 /target:winexe "/out:$output" /reference:System.Windows.Forms.dll /reference:System.Drawing.dll /reference:System.IO.Compression.dll /reference:System.IO.Compression.FileSystem.dll $sourcePath
if ($LASTEXITCODE -ne 0) { throw "Setup-Kompilierung fehlgeschlagen: $LASTEXITCODE" }
$stream = [System.IO.File]::Open($output, [System.IO.FileMode]::Append, [System.IO.FileAccess]::Write, [System.IO.FileShare]::None)
try {
    $payload = [System.IO.File]::OpenRead($archive)
    try { $payload.CopyTo($stream); $writer = New-Object System.IO.BinaryWriter($stream, [System.Text.Encoding]::UTF8, $true); $writer.Write([int64]$payload.Length); $writer.Flush() }
    finally { $payload.Dispose() }
}
finally { $stream.Dispose() }
Write-Host "Standalone-Setup mit Fortschrittsanzeige erstellt: $output"
