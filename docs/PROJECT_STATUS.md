# Mod Studio — Project status

As of 26 October 2026 · version `0.1.0-alpha.9` (Liquid Glass surface and Modspire integration fixes)

Mod Studio is a local workbench for designing, painting, editing, exporting and – for the currently supported target adapter – building Minecraft Java mods as structured projects. It is deliberately an authoring tool, not a modpack manager or a mod catalogue.

## What the alpha includes

- **Local Windows app:** the website and its backend run on `127.0.0.1` only and open in your normal browser. Projects live in `%LOCALAPPDATA%\ModStudio`.
- **Portable runtimes:** the ZIP contains Node.js 24.21.0, Eclipse Temurin JDK 25.0.4.1+1 including the compiler, and Gradle 9.8.2. On first start they are unpacked into the app's own `.runtime` folder. Installation changes neither system Java nor PATH and does not download these runtimes on the target PC. Minecraft/Fabric build dependencies are fetched from the official repositories on the first build.
- **Windows setup and updater:** `Mod-Studio-Setup.exe` contains the complete portable package and installs it app-locally under `%LOCALAPPDATA%\Programs\ModStudio\<version>`. Node.js, JDK, Gradle and the website are embedded; setup downloads no runtimes and launches the app afterwards. On start and via the **Updates** button, the app checks GitHub releases including pre-releases. An update downloads the setup only after an explicit click, verifies its SHA-256 from `SHA256SUMS.txt` and runs it. After launch the app only removes old version-bound install folders and files from its own update cache; projects and settings under `%LOCALAPPDATA%\ModStudio` are kept. `Mod-Studio.exe` shows its own loading screen, unpacks the local runtimes with progress and keeps the server running in the tray without a console window. `start-mod-studio.bat` remains available as a start option with a visible console. When embedded in Modspire, updates are managed by Modspire.
- **Project editing:** Java projects, items and blocks with names, identifiers, descriptions and matching properties. Changes are saved locally; projects can be reopened.
- **Time statistics:** "Time Spent Creating Mods" counts active time per project. The counter pauses when the browser window is hidden, loses focus or receives no input for five minutes; time is stored with the local project and survives restarts.
- **Sketch and preview:** 16×16 pixel texture with pen, eraser, fill tool, palette, undo/redo and clear. Texture, pixel preview and voxel/isometric preview share the same saved pixels. Items appear as floating texture sprites, blocks as cubes. The preview is project-bound; the empty start state never presents an invented finished texture as a user project.
- **Blockbench bridge:** selected Java items and blocks open as editable `.bbmodel` projects with an embedded 16×16 texture. Blockbench model projects or Minecraft Java block/item JSON can be imported back locally; supported cube geometry, UVs, faces, single-axis rotation and RGBA texture pixels are stored, shown in the preview and emitted as a model resource on build. Import currently accepts Java block/item with cube geometry, one 16×16 texture and Minecraft-compatible cube rotations. Blockbench opens as a standalone app/web app and is neither embedded in Mod Studio nor shipped with the installer.
- **ChatGPT:** local Sign in with ChatGPT OAuth flow with PKCE, state/nonce checks and OIDC/JWKS validation. Account sign-in and the one-time ChatGPT plan approval are shown separately; switching models starts no OAuth approval. Available ChatGPT models appear in the picker, and the choice persists across restarts. Credentials stay with the local service and are protected on Windows with DPAPI for the current user. The browser UI never receives stored tokens. API answers are shown as a reviewable change proposal; only applying it updates the project. Responses API calls set `store: false`.
- **Minecraft mod assistant:** a Minecraft Java specialist prompt with honest loader/version compatibility and practical suggestions. On explicit request ChatGPT can search official Minecraft/loader documentation; the provider's limits or possible extra costs apply. Ollama stays offline and never claims live research. ChatGPT and Ollama can turn clear lasting preferences and recurring corrections into rules on their own and store them locally per Windows user – globally or for the current project only. One-off requests and recognisable sensitive data, contact details and credentials are discarded. Rules can be viewed and deleted at any time. This is persistent memory, not hidden model fine-tuning. Follow-up questions leave the project unchanged; malformed AI element IDs are repaired without losing existing Blockbench models.
- **Interface:** a deep-black workshop with a narrow rounded glass sidebar, stacked headline, lime accents, floating glass orbs and a transparent live preview. Two surfaces are available – *Workshop* (default) and *Liquid Glass* (frosted panels over a Minecraft scene) – plus six animated backgrounds and "Off"; the choice is stored locally. Views, dialogs and new chat messages fade in; `prefers-reduced-motion` turns animations off. The first view still shows only an empty real sketch area, no invented mod texture.
- **Minecraft target picker:** the app loads all official Java releases from 1.12.2 dynamically from Mojang's manifest. Fabric, Quilt, Forge and NeoForge each show only the versions their official metadata reports as available; a bundled release list with a loader snapshot keeps the picker usable offline. The picker marks combinations without a build adapter. It is an availability picker, not a claim that every build adapter exists.
- **Local AI with Ollama (optional):** detects installed local models and can start the local Ollama service when needed. The AI edits the selected element; a 16×16 sketch is expanded deterministically from a structured four-colour palette into 256 editable pixels. An end-to-end HTTP test with Qwen2.5-14B produced an amethyst sketch with 256 pixels and four colours. Model weights are not shipped.
- **Source and export:** supported projects generate Java/Gradle source and resources from fixed templates. Users can export source archives and download a successfully built JAR. AI-generated text is never executed as a build script.
- **Items:** texture, stack size and fire resistance.
- **Blocks:** texture, hardness, blast resistance, light level and tool requirement; the generator creates registration, model, blockstate, loot table and resources.
- **Visual system:** "Dark Editorial" with matte anthracite, off-white, fine IDE dividers, a restrained lime accent and the locally bundled Geist Mono font. Responsive layout; Tailwind CSS is compiled and served locally.
- **Browser demo:** under `/demo/` the same workbench runs as a static GitHub Pages site. Projects and changes are stored in this browser's `localStorage`; a sample project makes the editor visible immediately. The assistant produces clearly labelled sample dialogues without external AI requests. The source view and JSON project export work; real Java/Gradle builds and ChatGPT sign-in are not available there. `npm run demo:build` generates the static files from `public/` and the version fallback.

## Verified build scope

| Target | Status |
| --- | --- |
| Minecraft Java 26.2 + Fabric — items and blocks | Implemented; a mixed item/block mod was built with the bundled JDK 25 and Gradle 9.8.2 and the JAR was inspected. |
| Fabric for other Minecraft versions | Selectable, not yet verified/enabled as buildable. |
| Forge, NeoForge and Quilt | Compatible releases appear in the picker; generator and builds are not implemented yet. |
| Recipes | The project model has recipe fields; creation/editing and generator support are still open. |
| Entities, tools, armour, effects, world generation, structures, GUIs | Later stages, not part of the current generator. |
| Linux/macOS | Not packaged; the first portable package is Windows x64. |

The long-term goal is a multi-tool across Java loaders and versions. A target only counts as supported once its adapter really generates source and resources and a build of that combination has been verified. The alpha therefore does not support "every version".

The desired later scope goes well beyond items and blocks: tools/weapons/armour, recipes, mobs and behaviour rules, biomes/dimensions/structures, machines, effects, GUIs, sounds/particles/animation, commands, network sync, tags, loot and balancing. The planned editor modules, architecture, loader strategy and phases are in [ROADMAP.md](ROADMAP.md); those contents are plans until they are marked as implemented and built.

## Package and checksums

Release: [v0.1.0-alpha.9 on GitHub](https://github.com/LvisXVI/minecraft-mod-studio/releases/tag/v0.1.0-alpha.9) — published as a full GitHub release (not a pre-release) and marked "Latest".

- Files: `Mod-Studio-Setup.exe` (single installer) and `Mod-Studio-Portable.zip` (unzip manually)
- Sizes and SHA-256: in `dist/SHA256SUMS.txt` and on the GitHub release
- Runtime archive checksums: [`licenses/runtime-checksums.txt`](../licenses/runtime-checksums.txt)
- Both packages contain the website, local server, scripts, font, licences and the Node/JDK/Gradle archives. The setup EXE embeds the complete portable ZIP; the portable variant has `Mod-Studio.exe` at the top level of the unpacked package.

## Setup and development

For users: download and run `Mod-Studio-Setup.exe`, or unzip the ZIP and start `Mod-Studio.exe`. Windows SmartScreen may ask about an unsigned alpha. ChatGPT sign-in and the first Minecraft build need internet access. Ollama is optional; without sign-in or a local model, manual sketching, editing and supported export still work.

For development: install Node.js 20+, then `npm install`, `npm run css:build` and `npm start`. Windows packages are built with `npm run dist:portable`; the required verified runtime archives must be in `.runtime/downloads/`. The build compiles the launcher/setup EXE with Windows PowerShell/.NET Framework.

## Checks performed

- JavaScript syntax checks for client and server modules passed; `npm test` passes (30 tests).
- Blockbench bridge: `.bbmodel` export/import, input validation, preservation of imported models through AI edits, project storage and generator output covered by tests.
- Tailwind CSS build and local serving of website assets and the Geist Mono font verified.
- Background layer in the item editor checked in a local browser view; the animation sits visibly behind texture and 3D areas without covering the pixel grid.
- Version catalogue with official Mojang, Fabric, Quilt, Forge and NeoForge metadata plus offline fallback covered by tests.
- Background and surface choice checked in the browser: options are selectable and the choice persists after reload.
- `npm audit`: no reported vulnerabilities.
- Runtime archives and their upstream SHA-256 values verified; portable ZIP contents and launcher entry checked.
- A real Fabric 26.2 build of a mixed item/block mod with the bundled runtimes succeeded; JAR file and contents inspected.
- Local Ollama end-to-end test with Qwen2.5-14B and a project-specific amethyst sketch succeeded.

These checks do not replace a live test with the end user's ChatGPT account or a running Minecraft client/modpack. A successful Java compile shows the generated project matches its target, not that it runs conflict-free with every other mod.

## Known limits and next work

1. Develop adapters and verified builds for more Minecraft versions and for Fabric, Forge, NeoForge and Quilt.
2. Extend Blockbench support to entity/Bedrock formats, multiple textures, animations and more model types.
3. Grow the module system beyond item/block: recipes/tags/loot first, then entity/world generation and game systems.
4. Package for more operating systems and verify the Windows update flow end-to-end in the installed alpha package.
5. Add a CI build matrix and reproducible compatibility evidence.
6. Choose a repository licence before granting third parties usage or redistribution rights. The code is currently marked `UNLICENSED` and has no `LICENSE` file.

## Origin and product scope

The goal was a standalone, practical mod-creation tool for Minecraft Java that will eventually span versions and loaders and produces real editable sketches. It is distinct from Modspire: the focus is creating and building your own mod projects, not modpacks or mod search. The linked design reference CreativeMod.net was offline / redirected to an unrelated site during research; no content was copied. The visual direction follows the design rules supplied by the user.
