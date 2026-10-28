$ErrorActionPreference = 'Stop'
$root = [System.IO.Path]::GetFullPath((Split-Path -Parent $PSScriptRoot))
$ui = Get-Content -LiteralPath (Join-Path $PSScriptRoot 'launcher-ui.cs') -Raw -Encoding UTF8
$entry = @'
internal static class ModStudioLauncher
{
    private static LoadingForm splash;
    private static Process server;
    private static NotifyIcon tray;
    private static string serverUrl;
    private static bool exiting;

    [STAThread]
    private static void Main()
    {
        Application.EnableVisualStyles();
        Application.SetCompatibleTextRenderingDefault(false);
        splash = new LoadingForm("Mod Studio startet");
        splash.Shown += (sender, e) => splash.PlayOpeningAnimation();
        splash.Shown += (sender, e) => System.Threading.Tasks.Task.Run((Action)Start);
        splash.FormClosing += (sender, e) => { if (!exiting && server != null && !server.HasExited) { e.Cancel = true; splash.Hide(); } };
        Application.Run(splash);
    }

    private static void Start()
    {
        try
        {
            string root = AppDomain.CurrentDomain.BaseDirectory;
            string runtime = Path.Combine(root, ".runtime");
            string downloads = Path.Combine(runtime, "downloads");
            string localData = Environment.GetFolderPath(Environment.SpecialFolder.LocalApplicationData);
            string cache = Path.Combine(localData, "ModStudio", "gradle-cache");
            var runtimes = new[] {
                new RuntimeFile("Node.js", Path.Combine(downloads, "node-v24.21.0-win-x64.zip"), Path.Combine(runtime, "node"), Path.Combine(runtime, "node", "node-v24.21.0-win-x64", "node.exe"), "158f7685b44de51f6c0df1d153526cbcd3e1bc739a8dfc607721cef75de9e541"),
                new RuntimeFile("Java-Compiler", Path.Combine(downloads, "temurin-jdk-25-windows-x64.zip"), Path.Combine(runtime, "jdk"), Path.Combine(runtime, "jdk", "jdk-25.0.4.1+1", "bin", "javac.exe"), "00c847d804f4a78e9f04f2683faf14fed898535b177b7fc704486cb0284e9283"),
                new RuntimeFile("Gradle", Path.Combine(downloads, "gradle-9.8.2-bin.zip"), Path.Combine(runtime, "gradle"), Path.Combine(runtime, "gradle", "gradle-9.8.2", "bin", "gradle.bat"), "21bd5da2de49b642904077f38c0efdc7778e92b3ed0889392dca61b97e389607")
            };

            int missing = 0;
            foreach (RuntimeFile item in runtimes) if (!File.Exists(item.Executable)) missing++;
            int prepared = 0;
            foreach (RuntimeFile item in runtimes)
            {
                if (File.Exists(item.Executable)) { prepared++; continue; }
                if (!File.Exists(item.Archive)) throw new FileNotFoundException("Eingebettete Laufzeit fehlt: " + item.Name, item.Archive);
                Update((int)Math.Round(5 + prepared * 83.0 / Math.Max(1, missing)), item.Name + " wird lokal vorbereitet.");
                VerifySha256(item.Archive, item.Sha256);
                ExtractArchive(item.Archive, item.Destination, item.Name, (bytes, total, status) => {
                    int percent = total == 0 ? 88 : (int)Math.Round(5 + (prepared + bytes / (double)total) * 83.0 / Math.Max(1, missing));
                    Update(percent, status);
                });
                if (!File.Exists(item.Executable)) throw new InvalidDataException(item.Name + " konnte nicht vollständig vorbereitet werden.");
                prepared++;
            }

            string node = runtimes[0].Executable;
            string javaHome = Path.Combine(runtime, "jdk", "jdk-25.0.4.1+1");
            string serverScript = Path.Combine(root, "server", "index.js");
            if (!File.Exists(serverScript)) throw new FileNotFoundException("Mod Studio ist unvollständig. Entpacke zuerst das vollständige ZIP.", serverScript);
            Directory.CreateDirectory(cache);
            Update(92, "Lokalen Mod-Server starten.");
            var info = new ProcessStartInfo { FileName = node, Arguments = "\"" + serverScript + "\"", WorkingDirectory = root, UseShellExecute = false, CreateNoWindow = true, RedirectStandardOutput = true, RedirectStandardError = true };
            info.EnvironmentVariables["JAVA_HOME"] = javaHome;
            info.EnvironmentVariables["PATH"] = Path.Combine(javaHome, "bin") + ";" + Environment.GetEnvironmentVariable("PATH");
            info.EnvironmentVariables["GRADLE_USER_HOME"] = cache;
            info.EnvironmentVariables["MOD_STUDIO_EXIT_WHEN_CLOSED"] = "1";
            server = new Process { StartInfo = info, EnableRaisingEvents = true };
            server.OutputDataReceived += (sender, e) => { if (e.Data != null) OnServerOutput(e.Data); };
            server.ErrorDataReceived += (sender, e) => { if (e.Data != null) AppendLog(e.Data); };
            server.Exited += (sender, e) => OnServerExit();
            if (!server.Start()) throw new InvalidOperationException("Der lokale Server konnte nicht gestartet werden.");
            server.BeginOutputReadLine(); server.BeginErrorReadLine();
        }
        catch (Exception error) { ShowError(error.Message); }
    }

    private static void OnServerOutput(string line)
    {
        AppendLog(line);
        const string prefix = "Mod Studio läuft unter ";
        if (line.StartsWith(prefix, StringComparison.Ordinal))
        {
            serverUrl = line.Substring(prefix.Length).Trim();
            if (splash.IsHandleCreated) splash.BeginInvoke(new Action(() => { Update(100, "Mod Studio ist bereit."); SetupTray(); splash.Hide(); }));
        }
    }

    private static void AppendLog(string line)
    {
        try { File.AppendAllText(Path.Combine(Environment.GetFolderPath(Environment.SpecialFolder.LocalApplicationData), "ModStudio", "launcher.log"), line + Environment.NewLine); } catch { }
    }

    private static void OnServerExit()
    {
        if (exiting) return;
        int exitCode = -1;
        try { exitCode = server.ExitCode; } catch { }
        if (exitCode == 0) {
            // the last browser tab was closed: the server left on purpose, so the launcher leaves too, silently
            exiting = true;
            if (splash.IsHandleCreated) splash.BeginInvoke(new Action(() => { if (tray != null) tray.Visible = false; Application.Exit(); })); else Application.Exit();
            return;
        }
        if (splash.IsHandleCreated) splash.BeginInvoke(new Action(() => {
            if (tray != null) tray.Visible = false;
            splash.Show(); splash.Activate(); Update(100, "Der lokale Mod-Server wurde beendet.");
            MessageBox.Show("Mod Studio wurde beendet. Details stehen unter %LOCALAPPDATA%\\ModStudio\\launcher.log.", "Mod Studio", MessageBoxButtons.OK, MessageBoxIcon.Information);
            exiting = true; Application.Exit();
        }));
    }

    private static System.Drawing.Icon TrayIcon()
    {
        try { return System.Drawing.Icon.ExtractAssociatedIcon(Application.ExecutablePath) ?? System.Drawing.SystemIcons.Application; }
        catch { return System.Drawing.SystemIcons.Application; }
    }

    private static void SetupTray()
    {
        var menu = new ContextMenuStrip();
        menu.Items.Add("Mod Studio öffnen", null, (sender, e) => { if (!String.IsNullOrEmpty(serverUrl)) Process.Start(new ProcessStartInfo { FileName = serverUrl, UseShellExecute = true }); });
        menu.Items.Add("Mod Studio beenden", null, (sender, e) => Exit());
        tray = new NotifyIcon { Text = "Mod Studio läuft", Icon = TrayIcon(), ContextMenuStrip = menu, Visible = true };
        tray.DoubleClick += (sender, e) => { if (!String.IsNullOrEmpty(serverUrl)) Process.Start(new ProcessStartInfo { FileName = serverUrl, UseShellExecute = true }); };
    }

    private static void Exit()
    {
        exiting = true;
        try { if (server != null && !server.HasExited) server.Kill(); } catch { }
        if (tray != null) tray.Visible = false;
        Application.Exit();
    }

    private static void Update(int value, string message) { if (splash != null && !splash.IsDisposed) splash.SetProgress(value, message); }
    private static void ShowError(string message)
    {
        if (splash.IsHandleCreated) splash.BeginInvoke(new Action(() => { splash.Show(); splash.Activate(); Update(0, "Start fehlgeschlagen."); MessageBox.Show(message + "\r\n\r\nDas ZIP kannst du jederzeit erneut entpacken und starten.", "Mod Studio konnte nicht starten", MessageBoxButtons.OK, MessageBoxIcon.Error); exiting = true; Application.Exit(); }));
    }

    private static void VerifySha256(string path, string expected)
    {
        using (FileStream stream = File.OpenRead(path)) using (SHA256 sha = SHA256.Create())
        {
            string actual = BitConverter.ToString(sha.ComputeHash(stream)).Replace("-", "").ToLowerInvariant();
            if (!String.Equals(actual, expected, StringComparison.OrdinalIgnoreCase)) throw new InvalidDataException("Die Laufzeitdatei ist beschädigt: " + Path.GetFileName(path));
        }
    }

    private static void ExtractArchive(string archive, string destination, string name, Action<long, long, string> progress)
    {
        Directory.CreateDirectory(destination);
        string root = Path.GetFullPath(destination).TrimEnd(Path.DirectorySeparatorChar) + Path.DirectorySeparatorChar;
        using (FileStream input = File.OpenRead(archive)) using (ZipArchive zip = new ZipArchive(input, ZipArchiveMode.Read))
        {
            long total = 0; foreach (ZipArchiveEntry entry in zip.Entries) total += entry.Length;
            long complete = 0; byte[] buffer = new byte[128 * 1024];
            foreach (ZipArchiveEntry entry in zip.Entries)
            {
                string target = Path.GetFullPath(Path.Combine(root, entry.FullName.Replace('/', Path.DirectorySeparatorChar)));
                if (!target.StartsWith(root, StringComparison.OrdinalIgnoreCase)) throw new InvalidDataException("Das Laufzeitarchiv enthält einen ungültigen Pfad.");
                if (String.IsNullOrEmpty(entry.Name)) { Directory.CreateDirectory(target); continue; }
                Directory.CreateDirectory(Path.GetDirectoryName(target));
                using (Stream source = entry.Open()) using (FileStream output = File.Create(target))
                {
                    int read;
                    while ((read = source.Read(buffer, 0, buffer.Length)) > 0)
                    {
                        output.Write(buffer, 0, read); complete += read;
                        if (complete % (2 * 1024 * 1024) < buffer.Length || complete >= total) progress(complete, total, name + " wird entpackt · " + (total == 0 ? 100 : (int)(complete * 100 / total)) + "%");
                    }
                }
                if (total == 0 || complete < total) progress(complete, total, name + " wird entpackt.");
            }
        }
    }

    private sealed class RuntimeFile
    {
        public readonly string Name, Archive, Destination, Executable, Sha256;
        public RuntimeFile(string name, string archive, string destination, string executable, string sha256) { Name = name; Archive = archive; Destination = destination; Executable = executable; Sha256 = sha256; }
    }
}
'@
$output = Join-Path $root 'Mod-Studio.exe'
$compiler = Join-Path $env:WINDIR 'Microsoft.NET\Framework64\v4.0.30319\csc.exe'
if (-not (Test-Path -LiteralPath $compiler)) { $compiler = Join-Path $env:WINDIR 'Microsoft.NET\Framework\v4.0.30319\csc.exe' }
if (-not (Test-Path -LiteralPath $compiler)) { throw 'Der Windows-.NET-Compiler wurde nicht gefunden.' }
$sourcePath = Join-Path $env:TEMP 'mod-studio-launcher-build.cs'
[System.IO.File]::WriteAllText($sourcePath, $ui + $entry, [System.Text.UTF8Encoding]::new($true))
$icon = Join-Path $root 'branding\mod-studio.ico'
if (-not (Test-Path -LiteralPath $icon)) { throw "Programmsymbol fehlt: $icon" }
& $compiler /nologo /codepage:65001 /target:winexe "/win32icon:$icon" "/out:$output" /reference:System.Windows.Forms.dll /reference:System.Drawing.dll /reference:System.IO.Compression.dll /reference:System.IO.Compression.FileSystem.dll $sourcePath
if ($LASTEXITCODE -ne 0) { throw "Launcher-Kompilierung fehlgeschlagen: $LASTEXITCODE" }
Write-Host "Windows-Launcher mit Ladebildschirm erstellt: $output"
