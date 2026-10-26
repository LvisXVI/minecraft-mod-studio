# Mod Studio — Towards a complete Java mod creator

Mod Studio should let people with any level of experience plan, paint, edit and build complete Minecraft Java mods as real projects – visually and with help from AI. A description should lead to concrete, reviewable project data: sketches, textures, models, properties, dependencies, code and game resources must stay connected yet individually editable.

This roadmap describes the intended product scope. It is not a claim that the features below already exist in the alpha. The verified current state is in [PROJECT_STATUS.md](PROJECT_STATUS.md).

## Creation flow

The [MCreator site](https://mcreator.net/) shows useful workflows: guided creation dialogs, direct WYSIWYG editing, shared asset management, integrated source code and a test/build step. Mod Studio follows the same practical sequence for Minecraft Java but combines it with project-bound editable sketches, local project ownership and traceable generators. The current editor already has project creation, texture/voxel preview, an element overview, a source view and build output; guided wizards and a standalone asset browser are part of the next stages. No MCreator assets or interfaces are copied.

## Goal: the content a mod typically needs

All content is stored in one shared project model. Visual content starts with a real, project-bound sketch or model editor. Rule-based content gets a matching visual or structured editor. AI suggestions stay reviewable changes, never opaque full overwrites.

### Game content

- Items, tools, weapons, armour, shields, food, potions, books and collectibles
- Blocks, ores, plants, saplings, doors, containers, machines, energy and fluid systems
- Creatures, NPCs, bosses, mounts and custom AI/behaviour rules
- Biomes, dimensions, structures, dungeons, ore and plant distribution and other world generation
- Status effects, enchantments, attributes, advancements and abilities
- Fluids, gases, particles, sounds, music, animations, loot and advancement goals
- Recipes and recipe books, tags, trading, spawns, tables and balancing rules
- GUIs, menus, HUD elements, configuration, commands, permissions, keybinds and network sync
- Localisation, resources, models, textures, 2D/3D assets, block models and entity models

### Matching workspaces

- Freehand sketch, pixel texture and palette with undo/redo, layers and transparent preview
- Block/item mock-ups and a 3D model/voxel editor with UV view, animation and material preview
- Visual recipe and flow diagrams, loot/spawn rules, state machines and AI behaviour
- Structure and dimension editor with height map, biome/feature placement and preview
- Property forms with units, value ranges, version hints and dependency checks
- Code view with navigation, source diff, diagnostics and manual editing
- AI assistant for creating, explaining and changing, with a concrete preview and selective apply
- Validation, dependency checks, build output, JAR/source export and installation guide

## Loader and version strategy

Support targets are individual combinations of loader, Minecraft version, Java version and required APIs. The UI may only mark a combination as buildable once generator, dependencies and build of that combination have been verified by the project pipeline.

Planned adapter families:

- Fabric
- Quilt
- Forge
- NeoForge
- Vanilla mod / datapack-style exports where no Java mod API is needed

Each adapter implements the same contract for target validation, project types, source and resources, dependencies, runtime requirements, build, diagnostics and export. Versions are treated as concrete adapter profiles, not as unchecked text replacements between releases. API differences are handled by small version-specific generators/compatibility layers.

The portable Windows app should ship JDK/Gradle runtimes matching the target combination and use them app-locally. Runtimes are versioned, checksum-verified and shipped with upstream licence notices. A single JDK cannot honestly be promised to fit every old and new Minecraft target. The app should fetch dependencies from official sources on the first build; it should never install tools system-wide or change PATH.

## Architecture rules

1. **One project model:** description, sketch, assets, properties, links, target profile, code overrides and build status belong to one versioned local project data structure.
2. **Typed feature modules:** game objects are modules with schema, capabilities, forms, editor, validation and generator. The UI should not stay hard-wired to item/block special cases.
3. **Targeted AI patches:** the model proposes typed project changes. Users can compare, apply or discard elements individually. AI may never run arbitrary shell commands or build scripts.
4. **Reusable assets:** textures, models, sounds, animations, localisations and tags can be referenced by several elements; changes show their impact.
5. **Truthful adapters:** project creation and preview can be planned, but build and export report precisely which feature/loader/version combinations work.
6. **Local project first:** saving and editing work without an account. ChatGPT/Ollama are optional providers. Access tokens stay in the local service; AI data is only sent to the chosen provider with a request.
7. **Verifiable results:** every enabled adapter needs representative reference projects, a build matrix and validated artefacts before the UI marks the combination as supported.

## Phases

1. **Solid alpha:** Fabric 26.2 items/blocks, sketch, properties, AI suggestions, source/JAR export and a portable Windows package (current state).
2. **Core authoring:** recipe editor, tags, loot, state/data components, more asset types, project overview and module registry.
3. **Model and world tools:** 3D/UV and entity models, animations, biomes, structures, dimensions and controlled world generation.
4. **Game systems:** machines/block entities, GUIs, effects, enchantments, fluids, commands, networking and configuration.
5. **Adapter expansion:** Quilt, NeoForge, Forge and more Fabric versions with verified build profiles and matching Java/Gradle selection.
6. **Platforms and stability:** CI build matrix, migration of older projects, diagnostics, recovery/backups, more OS packages and robust updates.

The order may change based on actual build/API dependencies. Users should always be able to see in the product which building blocks already work, which are in draft, and which are unavailable for the selected target.
