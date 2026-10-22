# Mod Studio — Projektstatus

Stand: 22. Oktober 2026 · Version `0.1.0-alpha.2` (Dokumentation und Windows-Launcher)

Mod Studio ist eine lokale Werkbank, mit der Nutzer Minecraft-Java-Mods als strukturierte Projekte entwerfen, zeichnen, bearbeiten, exportieren und für den derzeit unterstützten Zieladapter bauen. Es ist bewusst ein Autorentool, kein Modpack-Manager und kein Modkatalog.

## Was in der Alpha enthalten ist

- **Lokale Windows-App:** Die Website und ihr Backend laufen nur auf `127.0.0.1` und öffnen sich im normalen Browser. Projekte liegen in `%LOCALAPPDATA%\ModStudio`.
- **Portable Laufzeiten:** Das ZIP enthält Node.js 24.21.0, Eclipse Temurin JDK 25.0.4.1+1 samt Compiler und Gradle 9.8.2. Beim ersten Start werden sie in den App-eigenen `.runtime`-Ordner entpackt. Die Installation verändert weder System-Java noch PATH und lädt diese Laufzeiten nicht auf dem Ziel-PC nach. Minecraft-/Fabric-Build-Abhängigkeiten werden beim ersten Build aus den offiziellen Repositories geladen.
- **Windows-Launcher:** `Mod-Studio.exe` startet den mitgelieferten PowerShell-Launcher. Das PowerShell-Fenster bleibt während der Nutzung geöffnet, weil darin der lokale Dienst läuft. `start-mod-studio.bat` bleibt als alternative Startmöglichkeit enthalten. Die EXE ist ein Launcher im vollständigen entpackten App-Ordner und kein eigenständiger Ein-Datei-Installer.
- **Projektbearbeitung:** Java-Projekte, Items und Blöcke mit Namen, Kennungen, Beschreibungen und jeweils passenden Eigenschaften. Änderungen werden lokal gespeichert; Projekte lassen sich erneut öffnen.
- **Skizze und Vorschau:** 16×16-Pixeltextur mit Stift, Radierer, Füllwerkzeug, Farbpalette, Rückgängig/Wiederholen und Leeren. Textur, Pixelvorschau und Voxel-/isometrische Vorschau verwenden dieselben gespeicherten Pixel. Die Vorschau ist projektgebunden; der leere Startzustand gibt keine erfundene fertige Mod-Textur als Nutzerprojekt aus.
- **ChatGPT:** Lokaler Sign-in-with-ChatGPT-OAuth-Ablauf mit PKCE, State-/Nonce-Prüfung und OIDC/JWKS-Validierung. Zugangsdaten verbleiben beim lokalen Dienst und werden auf Windows mit DPAPI für den aktuellen Benutzer geschützt. Die Browseroberfläche erhält keine gespeicherten Tokens. API-Antworten werden als überprüfbarer Änderungsvorschlag angezeigt; erst Anwenden aktualisiert das Projekt. Responses-API-Aufrufe setzen `store: false`.
- **Lokale KI mit Ollama (optional):** Erkennt installierte lokale Modelle und kann den lokal laufenden Ollama-Dienst bei Bedarf starten. Die KI bearbeitet das ausgewählte Element; eine 16×16-Skizze wird aus einer strukturierten Vierfarben-Palette deterministisch zu 256 editierbaren Pixeln expandiert. Ein Ende-zu-Ende-HTTP-Test mit Qwen2.5-14B erzeugte eine Amethyst-Skizze mit 256 Pixeln und vier Farben. Modellgewichte werden nicht mitgeliefert.
- **Quelltext und Export:** Unterstützte Projekte erzeugen Java-/Gradle-Quelltext und Ressourcen aus festen Vorlagen. Nutzer können Quellprojekt-Archive exportieren und ein erfolgreich gebautes JAR herunterladen. KI-generierter Text wird nicht als Build-Skript ausgeführt.
- **Items:** Textur, Stapelgröße und Feuerresistenz.
- **Blöcke:** Textur, Härte, Explosionswiderstand, Lichtstärke und Werkzeuganforderung; der Generator erzeugt Registrierung, Modell, Blockstate, Loot-Tabelle und Ressourcen.
- **Visuelles System:** „Dark Editorial“ mit mattem Anthrazit, gebrochenem Weiß, feinen IDE-Trennlinien, reduzierter Hellgrün-Akzentfarbe und lokal eingebundener Geist-Mono-Schrift. Responsives Layout; Tailwind-CSS wird lokal kompiliert und lokal ausgeliefert.

## Verifizierter Build-Umfang

| Ziel | Status |
| --- | --- |
| Minecraft Java 26.2 + Fabric — Items und Blöcke | Implementiert; gemischter Item-/Block-Mod wurde mit dem gebündelten JDK 25 und Gradle 9.8.2 gebaut und das JAR geprüft. |
| Fabric für andere Minecraft-Versionen | Noch nicht als baubar verifiziert/freigeschaltet. |
| Forge, NeoForge und Quilt | In der Auswahl/Planung berücksichtigt, Generator und Builds sind noch nicht implementiert. |
| Rezepte | Projektmodell enthält Rezeptfelder; Erstellung/Bearbeitung und Generatorunterstützung sind noch offen. |
| Entitäten, Werkzeuge, Rüstung, Effekte, Weltgenerierung, Strukturen, Oberflächen | Spätere Ausbaustufen, nicht Teil des aktuellen Generators. |
| Linux/macOS | Nicht paketiert; erstes Portable-Paket ist Windows x64. |

Das langfristige Ziel ist ein Multitool für Java-Loader und Versionen. Ein Ziel gilt erst als unterstützt, wenn sein Adapter tatsächlich Quelltext und Ressourcen erzeugt und ein Build für diese Kombination geprüft wurde. Die Alpha unterstützt daher nicht „jede Version“.

Der gewünschte spätere Funktionsumfang geht deutlich über Items und Blöcke hinaus: Werkzeuge/Waffen/Rüstung, Rezepte, Mobs und Verhaltensregeln, Biome/Dimensionen/Strukturen, Maschinen, Effekte, GUIs, Sounds/Partikel/Animation, Befehle, Netzwerksynchronisation, Tags, Loot und Balancing. Die geplanten Editor-Module, Architektur, Loaderstrategie und Phasen stehen in [ROADMAP.md](ROADMAP.md); diese Inhalte sind Planung, bis sie als implementiert und gebaut ausgewiesen werden.

## Paket und Prüfsummen

Release: [v0.1.0-alpha.2 auf GitHub](https://github.com/LvisXVI/minecraft-mod-studio/releases/tag/v0.1.0-alpha.2)

- Datei: `Mod-Studio-Portable.zip`
- Größe: rund 311 MiB (die Release-Notiz nennt die genaue Größe)
- SHA-256: in der Release-Notiz und der beigefügten `SHA256SUMS.txt` angegeben
- Runtime-Archivprüfsummen: [`licenses/runtime-checksums.txt`](../licenses/runtime-checksums.txt)
- Paketinhalt umfasst Website, lokalen Server, Skripte, Schrift, Lizenzen und Node/JDK/Gradle-Archive. `Mod-Studio.exe` wird beim Erzeugen des Portables aus `scripts/build-launcher.ps1` kompiliert und liegt im entpackten Paket auf der obersten Ebene.

## Einrichtung und Entwicklung

Für Endnutzer: vollständiges ZIP herunterladen, entpacken und `Mod-Studio.exe` starten (oder `start-mod-studio.bat`). Auf Windows kann SmartScreen bei einer nicht signierten Alpha nachfragen. ChatGPT-Anmeldung und erster Minecraft-Build brauchen Internet. Ollama ist optional; ohne Login oder lokales Modell funktionieren manuelle Skizze, Bearbeitung und unterstützter Export weiterhin.

Für Entwicklung: Node.js 20+ installieren, dann `npm install`, `npm run css:build` und `npm start`. Das portable Windows-Paket wird mit `npm run dist:portable` erstellt; benötigte verifizierte Runtime-Archive müssen in `.runtime/downloads/` liegen. Der Build kompiliert den `Mod-Studio.exe`-Launcher mit Windows PowerShell/.NET Framework.

## Durchgeführte Prüfungen

- JavaScript-Syntaxprüfungen für Client- und Servermodule bestanden.
- Tailwind-CSS-Build und lokale Auslieferung der Website-Assets/Geist-Mono-Schrift geprüft.
- `npm audit`: keine gemeldeten Schwachstellen.
- Runtime-Archive und ihre Upstream-SHA-256-Werte geprüft; portable ZIP-Inhalte und Launcher-Eintrag geprüft.
- Echter Fabric-26.2-Build eines gemischten Item-/Block-Mods mit den gebündelten Laufzeiten erfolgreich; JAR-Datei und Inhalt geprüft.
- Lokaler Ollama-Ende-zu-Ende-Test mit Qwen2.5-14B und einer projektspezifischen Amethyst-Skizze erfolgreich.

Diese Prüfungen ersetzen keinen Live-Test mit dem ChatGPT-Konto des Endnutzers oder einem laufenden Minecraft-Client/Modpack. Erfolgreicher Java-Compile zeigt die Zielkompatibilität des erzeugten Projekts, aber nicht, dass es in jeder Kombination mit anderen Mods konfliktfrei läuft.

## Bekannte Grenzen und nächste Arbeiten

1. Eigene Adapter und verifizierte Builds für weitere Minecraft-Versionen sowie Fabric, Forge, NeoForge und Quilt entwickeln.
2. Modulsystem über Item/Block hinaus erweitern: zuerst Rezepte/Tags/Loot, dann Modelle, Entity-/Weltgenerierung und Spielsysteme.
3. Weitere Betriebssysteme paketieren und Update-/Installationsablauf ausbauen.
4. CI-Buildmatrix und reproduzierbare Kompatibilitätsnachweise ergänzen.
5. Repository-Lizenz auswählen, bevor Dritten Nutzungs- oder Weiterverteilungsrechte eingeräumt werden. Der aktuelle Code ist als `UNLICENSED` markiert und enthält keine `LICENSE`-Datei.

## Herkunft und Produktabgrenzung

Der Nutzer wünschte ein eigenständiges, praktisches Mod-Erstellungswerkzeug für Minecraft Java, das sich langfristig über Versionen und Loader erstreckt und echte editierbare Skizzen erzeugt. Das Produkt grenzt sich von Modspire ab: Fokus auf Erstellen und Bauen eigener Mod-Projekte, nicht auf Modpacks oder Mod-Suche. Die verlinkte Designreferenz CreativeMod.net war bei der Recherche offline/leitete auf eine fremde Seite weiter; daraus wurden keine Inhalte kopiert. Die visuelle Richtung folgt den vom Nutzer gelieferten Gestaltungsregeln.
