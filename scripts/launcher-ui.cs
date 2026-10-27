using System;
using System.Diagnostics;
using System.Drawing;
using System.Drawing.Drawing2D;
using System.IO;
using System.IO.Compression;
using System.Security.Cryptography;
using System.Text;
using System.Windows.Forms;

internal sealed class LoadingForm : Form
{
    private readonly Label detail;
    private readonly Label heading;
    private readonly Label percentage;
    private readonly Panel progressFill;
    private readonly Panel progressTrack;
    private readonly Timer openingTimer;
    private Point finalLocation;
    private readonly Stopwatch openingClock;
    private int progressValue;

    public LoadingForm(string title)
    {
        try { Icon = Icon.ExtractAssociatedIcon(Application.ExecutablePath); } catch { /* keeps the default icon */ }
        Text = "Mod Studio";
        StartPosition = FormStartPosition.CenterScreen;
        FormBorderStyle = FormBorderStyle.None;
        ShowInTaskbar = true;
        TopMost = true;
        ClientSize = new Size(560, 330);
        Opacity = 0;
        BackColor = Color.FromArgb(12, 13, 14);
        Font = new Font("Segoe UI", 10F, FontStyle.Regular, GraphicsUnit.Point);
        Padding = new Padding(1);
        finalLocation = Point.Empty;
        openingClock = new Stopwatch();
        openingTimer = new Timer { Interval = 15 };
        openingTimer.Tick += (sender, e) => {
            double progress = Math.Min(1.0, openingClock.Elapsed.TotalMilliseconds / 360.0);
            double eased = 1.0 - Math.Pow(1.0 - progress, 3.0);
            Opacity = eased;
            Top = finalLocation.Y + (int)Math.Round((1.0 - eased) * 14.0);
            if (progress >= 1.0) { openingTimer.Stop(); Opacity = 1.0; Location = finalLocation; }
        };

        var frame = new Panel { Dock = DockStyle.Fill, BackColor = Color.FromArgb(12, 13, 14), Padding = new Padding(32) };
        Controls.Add(frame);
        var accent = new Panel { Dock = DockStyle.Top, Height = 3, BackColor = Color.FromArgb(198, 255, 74) };
        frame.Controls.Add(accent);

        var brand = new Label { Text = "MOD STUDIO", AutoSize = true, ForeColor = Color.FromArgb(244, 245, 246), Font = new Font("Consolas", 10F, FontStyle.Bold), Location = new Point(0, 28) };
        frame.Controls.Add(brand);
        var product = new Label { Text = "MINECRAFT JAVA · CREATOR", AutoSize = true, ForeColor = Color.FromArgb(133, 139, 141), Font = new Font("Consolas", 8F), Location = new Point(0, 48) };
        frame.Controls.Add(product);

        var mark = new Panel { Location = new Point(0, 91), Size = new Size(48, 48), BackColor = Color.FromArgb(198, 255, 74) };
        mark.Paint += (sender, e) => {
            using (var pen = new Pen(Color.FromArgb(12, 13, 14), 2F)) {
                e.Graphics.SmoothingMode = SmoothingMode.None;
                e.Graphics.DrawRectangle(pen, 10, 10, 11, 11);
                e.Graphics.DrawRectangle(pen, 27, 10, 11, 11);
                e.Graphics.DrawRectangle(pen, 10, 27, 11, 11);
                e.Graphics.DrawRectangle(pen, 27, 27, 11, 11);
            }
        };
        frame.Controls.Add(mark);

        heading = new Label { Text = title, AutoSize = false, Location = new Point(0, 162), Size = new Size(494, 36), ForeColor = Color.FromArgb(244, 245, 246), Font = new Font("Segoe UI Semibold", 20F, FontStyle.Bold) };
        frame.Controls.Add(heading);
        detail = new Label { Text = "Deine lokale Mod-Werkstatt wird gestartet.", AutoSize = false, Location = new Point(0, 203), Size = new Size(494, 24), ForeColor = Color.FromArgb(164, 170, 172), Font = new Font("Segoe UI", 9.5F) };
        frame.Controls.Add(detail);

        progressTrack = new Panel { Location = new Point(0, 256), Size = new Size(494, 4), BackColor = Color.FromArgb(39, 43, 45) };
        progressFill = new Panel { Location = Point.Empty, Size = new Size(0, 4), BackColor = Color.FromArgb(198, 255, 74) };
        progressTrack.Controls.Add(progressFill);
        frame.Controls.Add(progressTrack);
        percentage = new Label { Text = "", AutoSize = true, Location = new Point(0, 272), ForeColor = Color.FromArgb(133, 139, 141), Font = new Font("Consolas", 8F) };
        frame.Controls.Add(percentage);
        var local = new Label { Text = "PROJEKTE BLEIBEN AUF DIESEM GERÄT", AutoSize = true, Location = new Point(0, 294), ForeColor = Color.FromArgb(104, 111, 113), Font = new Font("Consolas", 7.5F) };
        frame.Controls.Add(local);
    }

    public void PlayOpeningAnimation()
    {
        finalLocation = Location;
        Top = finalLocation.Y + 14;
        openingClock.Restart();
        openingTimer.Start();
    }

    protected override void OnPaint(PaintEventArgs e)
    {
        base.OnPaint(e);
        using (var pen = new Pen(Color.FromArgb(48, 52, 54))) e.Graphics.DrawRectangle(pen, 0, 0, ClientSize.Width - 1, ClientSize.Height - 1);
    }

    public void SetProgress(int value, string message)
    {
        if (InvokeRequired) { BeginInvoke(new Action<int, string>(SetProgress), value, message); return; }
        progressValue = Math.Max(0, Math.Min(100, value));
        detail.Text = message;
        progressFill.Width = (int)Math.Round(progressTrack.Width * progressValue / 100.0);
        percentage.Text = progressValue + "%";
        Refresh();
    }
}
