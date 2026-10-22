# Mod Studio — Minecraft Java

Mod Studio ist eine lokale Werkbank für Minecraft-Java-Mods. Skizze, Textur, Vorschau, Eigenschaften, Quellcode und der optionale ChatGPT-Dialog gehören zu einem Projekt. Die Anwendung dient der Mod-Erstellung und ist kein Modpack-Manager oder Modkatalog.

## Portable Windows-App

Lade `Mod-Studio-Portable.zip` herunter, entpacke es und starte `start-mod-studio.bat`. Beim ersten Start entpackt die App das mitgelieferte Node.js, JDK und Gradle in den eigenen `.runtime`-Ordner. Anschließend startet sie die lokale Website im Standardbrowser. JDK und Gradle ändern weder System-Java noch PATH oder globale Umgebungsvariablen. Das PowerShell-Fenster muss während der Nutzung geöffnet bleiben.

Projekte und geschützte ChatGPT-Zugangsdaten liegen unter `%LOCALAPPDATA%\ModStudio`. Der Server bindet ausschließlich an `127.0.0.1`. Die ChatGPT-Anmeldung nutzt den öffentlichen Sign-in-with-ChatGPT-Ablauf von OpenAI. Ollama kann optional als lokaler KI-Anbieter verwendet werden; wenn es installiert ist, startet Mod Studio den lokalen Dienst bei Bedarf und zeigt verfügbare Modelle im Editor. Modellgewichte werden nicht mit dem App-Paket ausgeliefert. ChatGPT-Anmeldung und erster Mod-Build benötigen Internet. Projektdateien bleiben lokal; beim ersten Build lädt Gradle Minecraft-/Fabric-Abhängigkeiten aus deren offiziellen Repositories.

Der portable Download ist groß, weil er Laufzeiten und Java-Compiler enthält. Auf dem Ziel-PC ist kein separater Download oder eine systemweite Installation dieser Werkzeuge nötig. Die Website, Geist-Mono-Schrift und das kompilierte Tailwind-CSS werden ebenfalls lokal ausgeliefert.

## Aktueller Build-Umfang

Der baubare Generator zielt derzeit auf Fabric für Minecraft 26.2. Er unterstützt Items und Blöcke mit bearbeitbaren 16×16-Texturen. Blöcke erhalten Registrierungen, Modell, Blockstate, Loot-Tabelle, Härte, Explosionswiderstand, Lichtstärke und optional die Werkzeuganforderung. Das Projekt lässt sich außerdem als Quellarchiv exportieren. Gebaut wird mit dem enthaltenen JDK 25 und Gradle 9.8.2; ein erzeugtes Mod-JAR kann aus dem Build-Bereich heruntergeladen werden. Ein echter Build eines gemischten Block-/Item-Mods wurde geprüft. Andere Java-Loader und Minecraft-Versionen sind noch nicht baubar freigeschaltet.

Die aktuelle Fabric-Einrichtung für Minecraft 26.2 verlangt JDK 25. Siehe den offiziellen [Fabric-Leitfaden für Blöcke](https://docs.fabricmc.net/develop/blocks/first-block), den [Fabric-Leitfaden für Items](https://docs.fabricmc.net/develop/items/first-item) und die [Build-Datei des Fabric-Beispielprojekts](https://github.com/FabricMC/fabric-example-mod/blob/26.2/build.gradle).

## Entwicklung

Der Server nutzt Node.js-Bordmittel. Tailwind wird beim Entwickeln in eine statische lokale CSS-Datei kompiliert. Mit Node.js 20 oder neuer: `npm install`, `npm run css:build` und `npm start`. Zum Entwickeln mit den Build-Werkzeugen die drei Laufzeitarchive nach `.runtime/node`, `.runtime/jdk` und `.runtime/gradle` entpacken oder den portablen Launcher nutzen.

Für das portable Windows-Paket `npm run dist:portable` ausführen. Das erstellt `dist/Mod-Studio-Portable.zip` mit Website, Launcher, Schriftdatei und den drei geprüften Laufzeitarchiven.

Drittlizenzen und Laufzeitprüfsummen stehen unter `licenses/`; die Originalarchive von Node, Temurin und Gradle enthalten ihre Upstream-Hinweise.
