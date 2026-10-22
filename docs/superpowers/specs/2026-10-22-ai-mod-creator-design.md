# AI Mod Creator — Product and Architecture

## Goal

Create a distinct, local-first authoring workbench for Minecraft Java mods. A creator describes an idea in ChatGPT, draws it, edits the resulting assets and properties directly, and exports a real mod project. This is a mod authoring product, not a modpack manager or catalog.

## Product decisions

- Scope is Minecraft Java Edition only.
- Chat, freehand pixel sketching, the editable asset and the generated project share one saved project model.
- The first end-to-end vertical slice targets Fabric and a current supported Minecraft release. Other Java mod loaders and historical version families plug into the same adapter contract; the UI must label support truthfully.
- Initial authored elements are items and blocks, including names, descriptions, textures, properties, and item/block recipes. The project model leaves room for entities, tools, armor, effects, world generation, structures and custom interfaces as later element modules.
- All project files stay on the user's computer. The shipped Windows portable package includes Node.js, a Temurin JDK 25 and Gradle; its one-click launcher extracts those bundled tools beside the app on first run and opens the local website in the user's existing browser. No runtimes are separately downloaded or installed system-wide. The local service owns filesystem access, ChatGPT OAuth callbacks, Windows DPAPI credential protection, model calls and builds. The browser never receives stored OAuth tokens.
- Sign-in follows OpenAI's public-client Sign in with ChatGPT flow with loopback callback, PKCE, state, nonce, OIDC/JWKS validation, requested plan-use scope, token refresh and local credential storage. Responses API calls use `store: false`, `stream: true`; only a completed response is treated as success.
- AI changes are proposed as a validated patch to structured project data. Trusted generator templates turn supported data into Java/resources; model-authored build scripts are not executed.
- Builds run against a fixed project template and selected adapter, with captured output, cancellation/timeout and truthful compatibility reporting. The app-managed toolchain is isolated from system Java. Generated Java is compiled but never run by the workbench.
- The default visual direction is Industrial dark editorial: matte #0c0d0e surfaces, #f4f5f6 type, fine neutral-800 separators, square controls and locally bundled Geist Mono. Acid lime #c6ff4a is reserved for the primary action and active state. The signature interaction is one pixel-art stroke appearing simultaneously in the drawing surface, item texture and voxel preview; the empty-state hero previews the real code-to-asset workflow with explicitly labeled example content.

## User flow

1. Launch the self-contained Windows package and create a named mod project; the app opens in the user's existing browser.
2. Select Minecraft Java target, loader and an actually supported version. Start with Fabric; show unimplemented adapter families as unavailable instead of implying they build.
3. Sketch an item or block on a 16×16 canvas, edit its palette and properties, and see the matching texture and voxel preview update immediately.
4. Connect ChatGPT, describe a change, and inspect the structured preview before applying it. AI requests are optional; local editing and project export remain available without sign-in.
5. Review generated source and resources, build when compatible JDK/Gradle are available, then export source project or installable JAR.

## Architecture

- **Portable local website:** a Windows launcher extracts the included Node runtime and opens a loopback-only site in the existing browser. Windows x64 is the first package target.
- **Embedded build runtime:** Temurin JDK 25 and a pinned Gradle distribution ship inside the app package. Generated projects use the embedded toolchain; Minecraft/Fabric artifacts may still be fetched from their official Maven repositories on the first build.
- **Local Node service:** loopback-only HTTP server, bounded JSON/file APIs, project persistence, encrypted token vault, OAuth callback and Responses API client.
- **Browser workbench:** accessible responsive UI split into project navigation, design stage and AI conversation; 2D texture editor, voxel preview, property editor, source view and build log.
- **Canonical project document:** versioned JSON schema contains target coordinates, elements, editable properties, texture pixels, prompts/history and file manifest. Writes are validated, atomic and scoped to the project root.
- **Loader adapter interface:** version discovery, target validation, starter template, model-to-source rendering, resource layout and build command. Adapter identity includes loader plus Minecraft version and toolchain requirements.
- **Safe generator:** fixed trusted templates produce source and resources only from validated project data. Builds use a private temporary working directory, argument arrays rather than shell interpolation, strict timeout, bounded logs and cleanup.
- **Export:** deterministic source archive plus a built JAR when compilation succeeds.

## Initial release boundary

The first release is a genuinely usable local vertical slice: project creation/save, pixel sketch, editable texture, voxel-style preview, item/block settings, one Fabric project generator, source export, structured AI editing after official ChatGPT sign-in, and build diagnostics. Adapter slots for other loaders are explicit, but are not called supported before their generator and build workflow is implemented.

The Windows release includes Node, JDK 25 (with compiler) and Gradle 9.8.2. The portable ZIP is large (roughly 330 MB before final ZIP overhead), and the first mod build still needs internet access to resolve loader/game libraries. It must not modify the user's system Java or PATH.

## Reference note

CreativeMod was supplied as design inspiration, but the URL redirected during review to an unrelated third-party page. No claims or designs from that redirected page were used. The product direction above is based on the user's stated goals.

## Current official references

- OpenAI, [Sign in with ChatGPT for open-source apps — registration and sign-in](https://developers.openai.com/siwc/token-sharing-open-source/sign-in)
- OpenAI, [Sign in with ChatGPT — models and inference](https://developers.openai.com/siwc/token-sharing-open-source/models-and-inference)
- Fabric, [Setting up the development environment](https://docs.fabricmc.net/develop/getting-started/setting-up)
