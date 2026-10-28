using System;
using System.Diagnostics;
using System.Drawing;
using System.Drawing.Drawing2D;
using System.Drawing.Text;
using System.IO;
using System.IO.Compression;
using System.Runtime.InteropServices;
using System.Security.Cryptography;
using System.Text;
using System.Windows.Forms;

// Start window of Mod Studio: the same liquid-glass look as the app (deep emerald, lime accent, rounded glass card).
internal sealed class LoadingForm : Form
{
    private static readonly Color Lime = Color.FromArgb(198, 255, 74);
    private static readonly Color Emerald = Color.FromArgb(46, 204, 133);

    private readonly string headingText;
    private string detailText = "Deine lokale Mod-Werkstatt wird gestartet.";
    private int progressValue;
    private float shown;               // eased progress that the bar actually draws
    private float phase;               // animation clock
    private readonly Timer openingTimer;
    private readonly Timer frameTimer;
    private readonly Stopwatch openingClock;
    private Point finalLocation;
    private readonly Icon appIcon;

    [DllImport("dwmapi.dll")] private static extern int DwmSetWindowAttribute(IntPtr hwnd, int attribute, ref int value, int size);

    public LoadingForm(string title)
    {
        headingText = title;
        try { Icon = Icon.ExtractAssociatedIcon(Application.ExecutablePath); appIcon = Icon; } catch { /* keeps the default icon */ }
        Text = "Mod Studio";
        StartPosition = FormStartPosition.CenterScreen;
        FormBorderStyle = FormBorderStyle.None;
        ShowInTaskbar = true;
        TopMost = true;
        ClientSize = new Size(620, 360);
        Opacity = 0;
        BackColor = Color.FromArgb(8, 15, 14);
        DoubleBuffered = true;
        SetStyle(ControlStyles.AllPaintingInWmPaint | ControlStyles.UserPaint | ControlStyles.OptimizedDoubleBuffer | ControlStyles.ResizeRedraw, true);
        finalLocation = Point.Empty;
        openingClock = new Stopwatch();
        openingTimer = new Timer { Interval = 15 };
        openingTimer.Tick += (sender, e) => {
            double progress = Math.Min(1.0, openingClock.Elapsed.TotalMilliseconds / 420.0);
            double eased = 1.0 - Math.Pow(1.0 - progress, 3.0);
            Opacity = eased;
            Top = finalLocation.Y + (int)Math.Round((1.0 - eased) * 16.0);
            if (progress >= 1.0) { openingTimer.Stop(); Opacity = 1.0; Location = finalLocation; }
        };
        frameTimer = new Timer { Interval = 33 };
        frameTimer.Tick += (sender, e) => {
            phase += 0.033f;
            shown += (progressValue - shown) * 0.16f;
            Invalidate();
        };
        frameTimer.Start();
    }

    protected override void OnHandleCreated(EventArgs e)
    {
        base.OnHandleCreated(e);
        // Windows 11 rounds the corners natively (smooth); older Windows gets a rounded region.
        bool rounded = false;
        try { int preference = 2; rounded = DwmSetWindowAttribute(Handle, 33, ref preference, 4) == 0; } catch { /* no DWM attribute */ }
        if (!rounded || Environment.OSVersion.Version.Build < 22000)
        {
            using (var path = RoundedRect(new Rectangle(0, 0, Width, Height), 26)) Region = new Region(path);
        }
    }

    protected override void OnFormClosed(FormClosedEventArgs e)
    {
        frameTimer.Stop();
        openingTimer.Stop();
        base.OnFormClosed(e);
    }

    public void PlayOpeningAnimation()
    {
        finalLocation = Location;
        Top = finalLocation.Y + 16;
        openingClock.Restart();
        openingTimer.Start();
    }

    public void SetProgress(int value, string message)
    {
        if (InvokeRequired) { BeginInvoke(new Action<int, string>(SetProgress), value, message); return; }
        progressValue = Math.Max(0, Math.Min(100, value));
        detailText = message;
        Invalidate();
    }

    private static GraphicsPath RoundedRect(Rectangle r, int radius)
    {
        int d = radius * 2;
        var path = new GraphicsPath();
        path.AddArc(r.X, r.Y, d, d, 180, 90);
        path.AddArc(r.Right - d, r.Y, d, d, 270, 90);
        path.AddArc(r.Right - d, r.Bottom - d, d, d, 0, 90);
        path.AddArc(r.X, r.Bottom - d, d, d, 90, 90);
        path.CloseFigure();
        return path;
    }

    protected override void OnPaint(PaintEventArgs e)
    {
        var g = e.Graphics;
        g.SmoothingMode = SmoothingMode.AntiAlias;
        g.TextRenderingHint = TextRenderingHint.ClearTypeGridFit;
        var all = new Rectangle(0, 0, Width, Height);

        // deep background
        using (var back = new LinearGradientBrush(all, Color.FromArgb(7, 24, 19), Color.FromArgb(9, 12, 27), 62f)) g.FillRectangle(back, all);
        float drift = (float)Math.Sin(phase * 0.7) * 18f;
        DrawGlow(g, new PointF(Width * 0.18f + drift, Height * 0.92f), 300, Color.FromArgb(70, Emerald));
        DrawGlow(g, new PointF(Width * 0.86f - drift, Height * 0.06f), 260, Color.FromArgb(54, Lime));
        DrawGlow(g, new PointF(Width * 0.62f, Height * 0.55f), 220, Color.FromArgb(26, 90, 150, 255));

        // glass card
        var card = new Rectangle(26, 26, Width - 52, Height - 52);
        using (var path = RoundedRect(card, 22))
        {
            using (var fill = new LinearGradientBrush(card, Color.FromArgb(34, 255, 255, 255), Color.FromArgb(12, 255, 255, 255), 90f)) g.FillPath(fill, path);
            using (var pen = new Pen(Color.FromArgb(46, 255, 255, 255), 1.2f)) g.DrawPath(pen, path);
            using (var shine = new Pen(Color.FromArgb(60, 255, 255, 255), 1f)) g.DrawLine(shine, card.X + 26, card.Y + 1, card.Right - 26, card.Y + 1);
        }

        // logo: four rounded blocks that breathe a little
        int logoX = card.X + 38, logoY = card.Y + 40;
        for (int i = 0; i < 4; i++)
        {
            int cx = logoX + (i % 2) * 30, cy = logoY + (i / 2) * 30;
            float lift = (float)Math.Sin(phase * 2.2 + i * 0.9) * 1.6f;
            var block = new Rectangle(cx, (int)(cy + lift), 24, 24);
            using (var path = RoundedRect(block, 6))
            using (var brush = new LinearGradientBrush(block, Lime, i == 3 ? Emerald : Color.FromArgb(168, 238, 60), 60f)) g.FillPath(brush, path);
        }

        using (var brandFont = new Font("Segoe UI Semibold", 26F, FontStyle.Regular, GraphicsUnit.Pixel))
        using (var tagFont = new Font("Segoe UI", 12.5F, FontStyle.Regular, GraphicsUnit.Pixel))
        {
            g.DrawString("Mod Studio", brandFont, Brushes.White, logoX + 82, logoY + 2);
            using (var muted = new SolidBrush(Color.FromArgb(170, 205, 220, 214))) g.DrawString("Minecraft-Mods bauen, lokal auf deinem PC", tagFont, muted, logoX + 84, logoY + 38);
        }

        // status
        using (var headingFont = new Font("Segoe UI Semibold", 19F, FontStyle.Regular, GraphicsUnit.Pixel))
        using (var detailFont = new Font("Segoe UI", 13.5F, FontStyle.Regular, GraphicsUnit.Pixel))
        {
            g.DrawString(headingText, headingFont, Brushes.White, card.X + 38, card.Y + 132);
            using (var muted = new SolidBrush(Color.FromArgb(190, 190, 206, 200)))
            {
                var detailRect = new RectangleF(card.X + 38, card.Y + 164, card.Width - 76, 24);
                using (var format = new StringFormat { Trimming = StringTrimming.EllipsisCharacter, FormatFlags = StringFormatFlags.NoWrap }) g.DrawString(detailText, detailFont, muted, detailRect, format);
            }
        }

        // progress bar
        var track = new Rectangle(card.X + 38, card.Y + 208, card.Width - 76, 8);
        using (var path = RoundedRect(track, 4)) using (var brush = new SolidBrush(Color.FromArgb(36, 255, 255, 255))) g.FillPath(brush, path);
        int fillWidth = (int)Math.Round(track.Width * Math.Max(0.02f, shown / 100f));
        if (progressValue > 0 || shown > 1)
        {
            var fill = new Rectangle(track.X, track.Y, Math.Max(8, fillWidth), track.Height);
            using (var path = RoundedRect(fill, 4))
            using (var brush = new LinearGradientBrush(fill, Lime, Emerald, 0f)) g.FillPath(brush, path);
            // moving highlight
            float shimmerX = fill.X + ((phase * 160f) % (fill.Width + 90f)) - 60f;
            g.SetClip(RoundedRect(fill, 4), CombineMode.Replace);
            using (var shine = new LinearGradientBrush(new RectangleF(shimmerX, fill.Y, 60, fill.Height), Color.FromArgb(0, 255, 255, 255), Color.FromArgb(120, 255, 255, 255), 0f) { WrapMode = WrapMode.TileFlipX })
                g.FillRectangle(shine, shimmerX, fill.Y, 60, fill.Height);
            g.ResetClip();
        }
        using (var percentFont = new Font("Consolas", 11.5F, FontStyle.Regular, GraphicsUnit.Pixel))
        using (var muted = new SolidBrush(Color.FromArgb(160, 190, 206, 200)))
        {
            string percent = progressValue + " %";
            var size = g.MeasureString(percent, percentFont);
            g.DrawString(percent, percentFont, muted, track.Right - size.Width + 2, track.Bottom + 8);
            g.DrawString("PROJEKTE BLEIBEN AUF DIESEM GERÄT", percentFont, muted, track.X, track.Bottom + 8);
        }

        // outer hairline
        using (var pen = new Pen(Color.FromArgb(52, 255, 255, 255), 1f)) g.DrawRectangle(pen, 0, 0, Width - 1, Height - 1);
    }

    private static void DrawGlow(Graphics g, PointF center, float radius, Color color)
    {
        using (var path = new GraphicsPath())
        {
            path.AddEllipse(center.X - radius, center.Y - radius, radius * 2, radius * 2);
            using (var brush = new PathGradientBrush(path))
            {
                brush.CenterColor = color;
                brush.SurroundColors = new[] { Color.FromArgb(0, color) };
                g.FillPath(brush, path);
            }
        }
    }
}
