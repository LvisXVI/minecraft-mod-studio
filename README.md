<div align="center">

# Mod Studio

### Deine Idee wird zum editierbaren Minecraft-Java-Projekt.

[![Latest release](https://img.shields.io/github/v/release/LvisXVI/minecraft-mod-studio?style=flat-square&color=8ee9dd&label=Release)](https://github.com/LvisXVI/minecraft-mod-studio/releases/latest)
[![Windows](https://img.shields.io/badge/Windows-Setup%20%2B%20Portable-15263b?style=flat-square&logo=windows)](https://github.com/LvisXVI/minecraft-mod-studio/releases/latest)
[![Java Edition](https://img.shields.io/badge/Minecraft-Java%20Edition-15263b?style=flat-square)](https://github.com/LvisXVI/minecraft-mod-studio)

[Website & Browser-Testversion](https://lvisxvi.github.io/minecraft-mod-studio/) · [Windows herunterladen](https://github.com/LvisXVI/minecraft-mod-studio/releases/latest) · [Projektstatus](docs/PROJECT_STATUS.md) · [Roadmap](docs/ROADMAP.md)

</div>

---

Mod Studio ist eine lokale Werkbank für Minecraft-Java-Mods. Beschreibe deine Idee, zeichne echte 16×16-Texturen, bearbeite Eigenschaften und Java-Quelltext und baue dein Projekt direkt auf deinem PC. ChatGPT ist optional; Ollama kann als lokaler KI-Anbieter genutzt werden. Die Website enthält unter **Browser-Testversion öffnen** eine interaktive Vorschau der echten Editor-Oberfläche. Projekte bleiben dort im Browser; Assistentenantworten sind simuliert und Java-Builds benötigen die Windows-App.

Unter **Einstellungen → Hintergrund** kannst du animierte Glaskugeln, Smaragd-Aurora, Raster, Kristall-Nebel, Ozeanfluss oder Redstone-Signal auswählen. Die Auswahl bleibt lokal gespeichert; **Aus** schaltet Effekte ab und reduzierte Bewegung hält Animationen an.

## Was du heute bauen kannst

- **Minecraft Java 26.2 mit Fabric:** derzeit verifizierter Build-Zieladapter.
- **Items und Blöcke:** einschließlich bearbeitbarer 16×16-Texturen und passender Projektdaten.
- **Lokales Projekt:** Eigenschaften, Skizze, Java-Quelltext, Ressourcen und Build bleiben zusammen.
- **JAR und Quellarchiv:** erzeugte Dateien lassen sich aus dem Build-Bereich herunterladen.
- **Optionale KI:** ChatGPT-Anmeldung oder ein verfügbares lokales Ollama-Modell.
- **Windows-Paket:** Setup und Portable-App enthalten Node.js, JDK und Gradle; auf dem Ziel-PC ist dafür keine separate Runtime-Installation nötig.

Forge, NeoForge, Quilt, weitere Minecraft-Versionen und weitere Inhaltstypen sind Ausbauziele und noch nicht als baubare Adapter freigeschaltet. Der [vollständige Status](docs/PROJECT_STATUS.md) trennt geprüfte Funktionen von der [Roadmap](docs/ROADMAP.md).

## Installation

Öffne [Releases](https://github.com/LvisXVI/minecraft-mod-studio/releases/latest) und lade `Mod-Studio-Setup.exe` herunter. Das Setup installiert die App und ihre gebündelten Laufzeiten unter `%LOCALAPPDATA%\Programs\ModStudio` und startet sie. Für eine portable Nutzung lade `Mod-Studio-Portable.zip`, entpacke sie und starte `Mod-Studio.exe`.

Projekte und Zugangsdaten bleiben lokal unter `%LOCALAPPDATA%\ModStudio`; der App-Server bindet an `127.0.0.1`. Die Anmeldung und der erste Minecraft-Build benötigen Internet. Projektdateien bleiben auf dem Gerät; Gradle lädt beim ersten Build die offiziellen Minecraft-/Fabric-Abhängigkeiten.

## Preview wechseln

Mod Studio und [Modspire](https://lvisxvi.github.io/modspire/) sind eigenständige Projekte. Auf der [Mod-Studio-Website](https://lvisxvi.github.io/minecraft-mod-studio/) findest du oben den Umschalter zwischen beiden Vorschauen.

## Entwicklung

Voraussetzung ist Node.js 20 oder neuer. Tailwind wird lokal kompiliert; der Server verwendet Node.js-Bordmittel.

```bash
npm install
npm run css:build
npm start
```

Die statische Browser-Testversion unter `docs/demo/` wird aus der App-Oberfläche erzeugt:

```bash
npm run demo:build
```

Für die Windows-Pakete:

```bash
npm run dist:portable
```

Dadurch entstehen `dist/Mod-Studio-Setup.exe`, `dist/Mod-Studio-Portable.zip` und `dist/SHA256SUMS.txt`. Lizenz- und Prüfsummenhinweise zu den gebündelten Laufzeiten findest du in [`licenses/`](licenses/).
