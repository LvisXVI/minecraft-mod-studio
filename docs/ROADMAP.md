# Mod Studio — Ausbau zum vollständigen Java-Mod-Creator

Mod Studio soll Nutzern mit unterschiedlichen Kenntnissen erlauben, vollständige Mods für Minecraft Java visuell und mit Hilfe von KI zu planen, zu zeichnen, zu bearbeiten und als echte Projekte zu bauen. Eine Beschreibung soll zu konkreten, überprüfbaren Projektdaten führen: Skizzen, Texturen, Modelle, Eigenschaften, Abhängigkeiten, Code und Spielressourcen müssen miteinander verbunden und einzeln veränderbar bleiben.

Diese Roadmap beschreibt den gewünschten Produktumfang. Sie ist keine Behauptung, dass die unten aufgeführten Funktionen schon in der Alpha vorhanden sind. Den verifizierten Ist-Stand nennt [PROJECT_STATUS.md](PROJECT_STATUS.md).

## Ziel: Inhalte, die ein Mod typischerweise braucht

Jeder Inhalt wird in einem gemeinsamen Projektmodell gespeichert. Wo ein Inhalt visuell ist, beginnt er mit einer echten, projektgebundenen Skizze oder einem Modell-Editor. Wo er aus Regeln besteht, erhält er einen passenden visuellen beziehungsweise strukturierten Editor. AI-Vorschläge bleiben prüfbare Änderungen, keine undurchsichtigen Komplettüberschreibungen.

### Spielinhalte

- Items, Werkzeuge, Waffen, Rüstung, Schilde, Nahrung, Tränke, Bücher und Sammelobjekte
- Blöcke, Erze, Pflanzen, Setzlinge, Türen, Behälter, Maschinen, Energie- und Flüssigkeitssysteme
- Kreaturen, NPCs, Bosse, Reittiere und eigene KI-/Verhaltensregeln
- Biome, Dimensionen, Strukturen, Dungeons, Erze, Pflanzenverteilung und weitere Weltgenerierung
- Status- und Statuseffekte, Verzauberungen, Attribute, Fortschritt und Fähigkeiten
- Flüssigkeiten, Gase, Partikel, Sounds, Musik, Animationen, Loot und Fortschrittsziele
- Rezepte und Rezeptbücher, Tags, Trading, Spawns, Tabellen und Balancing-Regeln
- GUIs, Menüs, HUD-Elemente, Konfigurationen, Befehle, Berechtigungen, Keybinds und Netzwerksynchronisation
- Lokalisierung, Ressourcen, Modelle, Texturen, 2D-/3D-Assets, Blockmodelle und Entity-Modelle

### Passende Arbeitsbereiche

- Freihand-Skizze, Pixeltextur und Palette mit Undo/Redo, Ebenen und transparenter Vorschau
- Block-/Item-Mockups und 3D-Modell-/Voxel-Editor mit UV-Ansicht, Animation und Materialvorschau
- Visuelle Rezept- und Ablaufdiagramme, Loot-/Spawn-Regeln, Zustandsmaschinen und KI-Verhalten
- Struktur- und Dimension-Editor mit Höhenkarte, Biome-/Feature-Platzierung und Vorschau
- Eigenschaftsformulare mit Einheiten, Wertebereichen, Version-Hinweisen und Abhängigkeitsprüfung
- Codeansicht mit Navigation, Quelltextvergleich, Diagnosemeldungen und manueller Bearbeitung
- KI-Assistent für Erstellen, Erklären und Ändern, mit konkreter Vorschau und selektivem Anwenden
- Validierung, Abhängigkeitsprüfung, Build-Ausgabe, JAR-/Quellcodeexport und Installationsanleitung

## Loader- und Versionsstrategie

Unterstützungsziele sind einzelne Kombinationen aus Loader, Minecraft-Version, Java-Version und benötigten APIs. Das UI darf eine Kombination erst als baubar markieren, wenn Generator, Abhängigkeiten und Build dieser Kombination durch die Projektpipeline geprüft sind.

Geplante Adapterfamilien:

- Fabric
- Quilt
- Forge
- NeoForge
- Vanilla-Mod-/Datapack-nahe Exporte dort, wo keine Java-Mod-API benötigt wird

Jeder Adapter implementiert denselben Vertrag für Zielvalidierung, Projekttypen, Quelltext und Ressourcen, Abhängigkeiten, Runtime-Anforderungen, Build, Diagnose und Export. Versionen werden als konkrete Adapterprofile behandelt, nicht durch ungesicherte Text-Ersetzungen zwischen Releases. API-Abweichungen werden über kleine versionsspezifische Generatoren/Kompatibilitätsschichten abgefangen.

Die portable Windows-App soll zur Zielkombination passende JDK-/Gradle-Laufzeiten im Paket anbieten und diese app-lokal verwenden. Laufzeiten werden versioniert, auf Prüfsummen geprüft und mit Upstream-Lizenzhinweisen ausgeliefert. Ein einzelnes JDK kann nicht ehrlich als passend für alle alten und neuen Minecraft-Zielversionen versprochen werden. Die App soll Abhängigkeiten beim ersten Build aus offiziellen Quellen beziehen; sie soll keine Werkzeuge systemweit installieren oder PATH ändern.

## Architekturregeln

1. **Ein Projektmodell:** Beschreibung, Skizze, Assets, Eigenschaften, Verknüpfungen, Zielprofil, Code-Overrides und Buildstatus gehören zu einer versionierten lokalen Projektdatenstruktur.
2. **Typisierte Feature-Module:** Spielobjekte sind Module mit Schema, Fähigkeiten, Formularen, Editor, Validierung und Generator. Die Oberfläche soll nicht auf Item-/Block-Sonderfälle fest verdrahtet bleiben.
3. **Gezielte KI-Patches:** Das Modell schlägt typisierte Projektänderungen vor. Der Nutzer kann Elemente einzeln vergleichen und anwenden oder verwerfen. AI darf keine beliebigen Shell-Befehle oder Buildskripte ausführen.
4. **Wiederverwendbare Assets:** Texturen, Modelle, Sounds, Animationen, Lokalisierungen und Tags können von mehreren Elementen referenziert werden; Änderungen zeigen ihre Auswirkungen.
5. **Wahrheitsgemäße Adapter:** Projekterstellung und Vorschau können geplant werden, aber Build und Export melden präzise, welche Feature-/Loader-/Versionskombinationen funktionieren.
6. **Lokales Projekt zuerst:** Speicherung und Bearbeitung funktionieren ohne Konto. ChatGPT/Ollama sind optionale Anbieter. Zugangstoken bleiben im lokalen Dienst; KI-Daten werden erst mit einer Anfrage an den jeweils gewählten Anbieter übertragen.
7. **Prüfbare Ergebnisse:** Jeder freigeschaltete Adapter braucht repräsentative Referenzprojekte, Buildmatrix und validierte Artefakte, bevor das UI die Kombination als unterstützt kennzeichnet.

## Ausbauphasen

1. **Solide Alpha:** Fabric 26.2 Items/Blöcke, Skizze, Eigenschaften, KI-Vorschläge, Source-/JAR-Export und portables Windows-Paket (aktueller Stand).
2. **Kern-Authoring:** Rezepteditor, Tags, Loot, Status-/Datenkomponenten, mehr Asset-Typen, Projektübersicht und Modul-Registry.
3. **Modell- und Weltwerkzeuge:** 3D-/UV- und Entity-Modelle, Animationen, Biome, Strukturen, Dimensionen und kontrollierte Weltgenerierung.
4. **Spielsysteme:** Maschinen/Block Entities, GUIs, Effekte, Verzauberungen, Flüssigkeiten, Befehle, Netzwerk und Konfiguration.
5. **Adapterausbau:** Quilt, NeoForge, Forge und zusätzliche Fabric-Versionen mit verifizierten Build-Profilen und passender Java-/Gradle-Auswahl.
6. **Plattformen und Stabilität:** CI-Buildmatrix, Migration älterer Projekte, Diagnose, Recovery/Backups, weitere Betriebssystempakete und robuste Updates.

Die Reihenfolge kann sich nach tatsächlichen Build-/API-Abhängigkeiten ändern. Nutzer sollen im Produkt erkennen können, welche Bausteine bereits funktionieren, sich im Entwurf befinden oder für das ausgewählte Ziel nicht verfügbar sind.
