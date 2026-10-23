# Mod Studio — Projektstatus

Stand: 23. Oktober 2026 · Version `0.1.0-alpha.5` (Updater, ChatGPT-Modellauswahl, anpassbare Glasoberfläche und Windows-Setup)

Mod Studio ist eine lokale Werkbank, mit der Nutzer Minecraft-Java-Mods als strukturierte Projekte entwerfen, zeichnen, bearbeiten, exportieren und für den derzeit unterstützten Zieladapter bauen. Es ist bewusst ein Autorentool, kein Modpack-Manager und kein Modkatalog.

## Was in der Alpha enthalten ist

- **Lokale Windows-App:** Die Website und ihr Backend laufen nur auf `127.0.0.1` und öffnen sich im normalen Browser. Projekte liegen in `%LOCALAPPDATA%\ModStudio`.
- **Portable Laufzeiten:** Das ZIP enthält Node.js 24.21.0, Eclipse Temurin JDK 25.0.4.1+1 samt Compiler und Gradle 9.8.2. Beim ersten Start werden sie in den App-eigenen `.runtime`-Ordner entpackt. Die Installation verändert weder System-Java noch PATH und lädt diese Laufzeiten nicht auf dem Ziel-PC nach. Minecraft-/Fabric-Build-Abhängigkeiten werden beim ersten Build aus den offiziellen Repositories geladen.
- **Windows-Setup und Updater:** `Mod-Studio-Setup.exe` enthält das vollständige portable Paket und installiert es app-lokal unter `%LOCALAPPDATA%\Programs\ModStudio\0.1.0-alpha.4`. Node.js, JDK, Gradle und Website sind bereits eingebettet; der Setup-Vorgang lädt keine Laufzeiten nach und startet anschließend die App. Die App prüft beim Start und per **Updates**-Schaltfläche die GitHub-Releases einschließlich Vorabversionen. Ein Update lädt das Setup erst nach ausdrücklichem Klick, prüft die SHA-256-Prüfsumme aus `SHA256SUMS.txt` und startet es. `Mod-Studio.exe` zeigt einen eigenen Ladebildschirm, entpackt die lokalen Laufzeiten mit Fortschritt und hält den Server ohne Konsolenfenster im Infobereich aktiv. `start-mod-studio.bat` bleibt als Startoption mit sichtbarer Konsole verfügbar.
- **Projektbearbeitung:** Java-Projekte, Items und Blöcke mit Namen, Kennungen, Beschreibungen und jeweils passenden Eigenschaften. Änderungen werden lokal gespeichert; Projekte lassen sich erneut öffnen.
- **Zeitstatistik:** „Time Spent Creating Mods“ zählt aktive Zeit pro Projekt. Der Zähler pausiert, wenn das Browserfenster verborgen ist, den Fokus verliert oder fünf Minuten keine Eingabe erhält; Zeit wird mit dem lokalen Projekt gespeichert und bleibt nach einem Neustart erhalten.
- **Skizze und Vorschau:** 16×16-Pixeltextur mit Stift, Radierer, Füllwerkzeug, Farbpalette, Rückgängig/Wiederholen und Leeren. Textur, Pixelvorschau und Voxel-/isometrische Vorschau verwenden dieselben gespeicherten Pixel. Die Vorschau ist projektgebunden; der leere Startzustand gibt keine erfundene fertige Mod-Textur als Nutzerprojekt aus.
- **Blockbench-Brücke:** Ausgewählte Java-Items und -Blöcke lassen sich als editierbare `.bbmodel`-Projekte mit eingebetteter 16×16-Textur öffnen. Blockbench-Modellprojekte oder Minecraft-Java-Block/Item-JSON können lokal wieder importiert werden; unterstützte Cube-Geometrie, UVs, Seiten und Einzelachsenrotation werden gespeichert, in der Vorschau angezeigt und beim Build als Modellressource ausgegeben. Der Import akzeptiert derzeit Java Block/Item mit Würfelgeometrie, einer 16×16-Textur und Minecraft-kompatiblen Cube-Rotationen. Blockbench wird als eigenständige Anwendung/Web-App geöffnet und nicht in Mod Studio eingebettet oder mit dem Installer ausgeliefert.
- **ChatGPT:** Lokaler Sign-in-with-ChatGPT-OAuth-Ablauf mit PKCE, State-/Nonce-Prüfung und OIDC/JWKS-Validierung. Kontoanmeldung und einmalige ChatGPT-Planfreigabe werden getrennt dargestellt; Modellwechsel startet keine OAuth-Freigabe. Verfügbare ChatGPT-Modelle erscheinen im Auswahlfeld, die Auswahl bleibt lokal über App-Neustarts erhalten. Zugangsdaten verbleiben beim lokalen Dienst und werden auf Windows mit DPAPI für den aktuellen Benutzer geschützt. Die Browseroberfläche erhält keine gespeicherten Tokens. API-Antworten werden als überprüfbarer Änderungsvorschlag angezeigt; erst Anwenden aktualisiert das Projekt. Responses-API-Aufrufe setzen `store: false`.
- **Oberfläche:** Startansicht orientiert sich an der jüngsten Vorlage: tiefschwarzer Hintergrund, schmale abgerundete Glas-Seitenleiste, gestapelte Headline, limettengrüne Akzente, schwebende Glaskugeln und transparente Live-Vorschau. Über die Hintergrundauswahl stehen schwebende Kugeln, Smaragd-Aurora, animiertes Raster und „Aus“ bereit; die Auswahl bleibt lokal gespeichert. `prefers-reduced-motion` schaltet die Animationen ab. Der erste Eindruck zeigt weiterhin nur eine leere echte Skizzenfläche, keine erfundene Mod-Textur.
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

Release: [v0.1.0-alpha.4 auf GitHub](https://github.com/LvisXVI/minecraft-mod-studio/releases/tag/v0.1.0-alpha.4) (nach Veröffentlichung verfügbar)

- Dateien: `Mod-Studio-Setup.exe` (einzelner Installer) und `Mod-Studio-Portable.zip` (manuell entpackbar)
- Größen und SHA-256: in `dist/SHA256SUMS.txt` und im GitHub-Release angegeben
- Runtime-Archivprüfsummen: [`licenses/runtime-checksums.txt`](../licenses/runtime-checksums.txt)
- Beide Pakete enthalten Website, lokalen Server, Skripte, Schrift, Lizenzen und Node/JDK/Gradle-Archive. Die Setup-EXE bettet das vollständige Portable-ZIP ein; die portable Variante enthält `Mod-Studio.exe` im entpackten Paket auf der obersten Ebene.

## Einrichtung und Entwicklung

Für Endnutzer: `Mod-Studio-Setup.exe` herunterladen und starten oder das ZIP entpacken und `Mod-Studio.exe` starten. Auf Windows kann SmartScreen bei einer nicht signierten Alpha nachfragen. ChatGPT-Anmeldung und erster Minecraft-Build brauchen Internet. Ollama ist optional; ohne Login oder lokales Modell funktionieren manuelle Skizze, Bearbeitung und unterstützter Export weiterhin.

Für Entwicklung: Node.js 20+ installieren, dann `npm install`, `npm run css:build` und `npm start`. Die Windows-Pakete werden mit `npm run dist:portable` erstellt; benötigte verifizierte Runtime-Archive müssen in `.runtime/downloads/` liegen. Der Build kompiliert die Launcher-/Setup-EXE mit Windows PowerShell/.NET Framework.

## Durchgeführte Prüfungen

- JavaScript-Syntaxprüfungen für Client- und Servermodule bestanden.
- Blockbench-Brücke: `.bbmodel`-Export/Import, Eingabevalidierung, KI-Erhalt importierter Modelle, Projektspeicherung und Generatorausgabe mit Tests geprüft.
- Tailwind-CSS-Build und lokale Auslieferung der Website-Assets/Geist-Mono-Schrift geprüft.
- Hintergrundauswahl im Browser geprüft: alle vier Optionen sind wählbar und die Einstellung „Animiertes Raster“ blieb nach Neuladen erhalten; Standard wieder auf „Schwebende Kugeln“ gesetzt.
- `npm audit`: keine gemeldeten Schwachstellen.
- Runtime-Archive und ihre Upstream-SHA-256-Werte geprüft; portable ZIP-Inhalte und Launcher-Eintrag geprüft.
- Echter Fabric-26.2-Build eines gemischten Item-/Block-Mods mit den gebündelten Laufzeiten erfolgreich; JAR-Datei und Inhalt geprüft.
- Lokaler Ollama-Ende-zu-Ende-Test mit Qwen2.5-14B und einer projektspezifischen Amethyst-Skizze erfolgreich.

Diese Prüfungen ersetzen keinen Live-Test mit dem ChatGPT-Konto des Endnutzers oder einem laufenden Minecraft-Client/Modpack. Erfolgreicher Java-Compile zeigt die Zielkompatibilität des erzeugten Projekts, aber nicht, dass es in jeder Kombination mit anderen Mods konfliktfrei läuft.

## Bekannte Grenzen und nächste Arbeiten

1. Eigene Adapter und verifizierte Builds für weitere Minecraft-Versionen sowie Fabric, Forge, NeoForge und Quilt entwickeln.
2. Blockbench-Unterstützung um Entity-/Bedrock-Formate, mehrere Texturen, Animationen und weitere Modelltypen erweitern.
3. Modulsystem über Item/Block hinaus erweitern: zuerst Rezepte/Tags/Loot, dann Entity-/Weltgenerierung und Spielsysteme.
4. Weitere Betriebssysteme paketieren und den Windows-Updateablauf im installierten Alpha-Paket end-to-end prüfen.
5. CI-Buildmatrix und reproduzierbare Kompatibilitätsnachweise ergänzen.
6. Repository-Lizenz auswählen, bevor Dritten Nutzungs- oder Weiterverteilungsrechte eingeräumt werden. Der aktuelle Code ist als `UNLICENSED` markiert und enthält keine `LICENSE`-Datei.

## Herkunft und Produktabgrenzung

Der Nutzer wünschte ein eigenständiges, praktisches Mod-Erstellungswerkzeug für Minecraft Java, das sich langfristig über Versionen und Loader erstreckt und echte editierbare Skizzen erzeugt. Das Produkt grenzt sich von Modspire ab: Fokus auf Erstellen und Bauen eigener Mod-Projekte, nicht auf Modpacks oder Mod-Suche. Die verlinkte Designreferenz CreativeMod.net war bei der Recherche offline/leitete auf eine fremde Seite weiter; daraus wurden keine Inhalte kopiert. Die visuelle Richtung folgt den vom Nutzer gelieferten Gestaltungsregeln.
