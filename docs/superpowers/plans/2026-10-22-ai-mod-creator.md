# AI Mod Creator Implementation Plan

> **For agentic workers:** Implement inline in the current Codex session. Follow this plan task-by-task. Steps use checkbox syntax for progress tracking.

**Goal:** Deliver a local-first Minecraft Java mod-authoring workbench whose chat, sketch, editable assets, preview and project export remain connected.

**Architecture:** A portable Windows launcher unpacks a bundled Node runtime and opens the local website in the user's browser. A loopback service owns auth, project files, AI requests, source generation and builds. The package includes Temurin JDK 25 and Gradle. The project document is the shared source of truth; loader adapters render validated data into trusted templates.

**Tech Stack:** Node.js 24 built-ins, HTML, CSS, browser JavaScript, OpenAI Sign in with ChatGPT public-client OAuth, Responses API, Fabric Gradle project template.

**Spec:** `docs/superpowers/specs/2026-10-22-ai-mod-creator-design.md`

## Global Constraints

- Minecraft Java only; do not add Bedrock behavior.
- Keep the product distinct from Modspire: no pack manager, mod catalog/search, or pack-selection flow.
- Never send OAuth credentials to browser JavaScript, logs, generated source, or Git.
- Implement loader/version adapter interfaces and label only implemented targets as supported.
- AI supplies project patches; it does not control build scripts or arbitrary shell commands.
- Keep the server bound to `127.0.0.1` and validate every project path and request body.
- Do not add or run automated tests unless the user asks; use build/syntax/manual preview checks instead.
- Never install a JDK or Gradle globally. Include their verified upstream archives in the portable package and unpack under `.runtime/` on first launch so users do not download developer tools separately.

## Review Focus

- OAuth callback tampering or access-denied responses: reject state/client mismatch without exchanging a code.
- Missing or expired ChatGPT plan permission: keep editor usable and explain reconnect/permission state.
- Malformed AI project patch: reject without corrupting saved project or drawing.
- Traversal or oversized project payload: reject before reading/writing outside the project root.
- Missing/old Java or absent Gradle: preserve project and report clear build prerequisites.

---

### Task 1: Project foundation and local service

**Files:**
- Create: `package.json`
- Create: `.gitignore`
- Create: `server/index.js`
- Create: `server/http.js`
- Create: `server/projects.js`
- Create: `server/schema.js`
- Create: `public/index.html`

**Interfaces:**
- `createServer({ rootDir, dataDir }) -> http.Server`
- `listProjects() -> ProjectSummary[]`
- `createProject(input) -> Project`
- `readProject(id) -> Project`
- `writeProject(id, project) -> Project`
- `validateProject(project) -> Project`

- [ ] Build the bounded loopback router, JSON limits, safe static asset serving and startup banner.
- [ ] Add atomic project persistence under an app data directory, with strict ID/path validation.
- [ ] Add create/list/read/update APIs and an empty first-run state.
- [ ] Add scripts for `npm start` and clean server shutdown.

### Task 2: Creative workbench UI

**Files:**
- Create: `public/styles.css`
- Create: `public/app.js`
- Create: `public/editor.js`
- Create: `public/api.js`

**Interfaces:**
- `renderWorkbench(root, project, actions) -> void`
- `createPixelEditor(canvas, texture, onChange) -> { setTool(), setColor(), undo(), redo(), destroy() }`
- `renderVoxelPreview(canvas, pixels, element) -> void`
- `request(path, options) -> Promise<Response>`

- [ ] Create distinct Swiss editor shell with project rail, target toolbar, design canvas and AI panel.
- [ ] Implement item/block project setup, property editing, selectable loader/version target controls and capability labels.
- [ ] Implement 16×16 pixel editor with palette, pencil/eraser/fill, pointer drag, undo/redo and clear.
- [ ] Render the same texture as a flat sprite and a voxel/isometric preview; connect every edit to the project document and autosave.
- [ ] Add source, assets and build views that use actual saved project data.
- [ ] Make narrow layouts usable with collapsible panels and keyboard-accessible controls.

### Task 3: ChatGPT sign-in and AI edits

**Files:**
- Create: `server/auth/oauth.js`
- Create: `server/auth/oidc.js`
- Create: `server/auth/vault.js`
- Create: `server/ai.js`
- Modify: `server/http.js`
- Modify: `public/app.js`

**Interfaces:**
- `beginSignIn() -> { authorizationUrl, attemptId }`
- `handleCallback(url) -> AuthStatus`
- `getAuthStatus() -> AuthStatus`
- `refreshActiveCredentials() -> CredentialRecord`
- `streamProjectEdit(project, messages, emit) -> void`
- `applyAiPatch(project, patch) -> Project`

- [ ] Add loopback OAuth with fresh state/nonce/PKCE, dynamic registration, callback checks and fixed callback path.
- [ ] Validate ID token signature, issuer, audience, expiry and nonce using OpenAI JWKS; check granted plan-use scope.
- [ ] Encrypt stored credential records with Windows current-user DPAPI; keep secrets out of browser and logs.
- [ ] Discover account-supported models and proxy a streamed Responses API request with `store:false`.
- [ ] Require complete response and validated JSON patch before applying project changes; show errors without losing local edits.
- [ ] Add sign-in/out/connected UI and persist conversation messages in the project.

### Task 4: Fabric source generator, export and build diagnostics

**Files:**
- Create: `server/adapters/types.js`
- Create: `server/adapters/fabric.js`
- Create: `server/generator.js`
- Create: `server/zip.js`
- Create: `server/build.js`
- Create: `templates/fabric/*`
- Modify: `server/http.js`
- Modify: `public/app.js`

**Interfaces:**
- `getAdapter(loaderId) -> LoaderAdapter`
- `validateTarget(target) -> TargetCapability`
- `generateProject(project, destination) -> GeneratedFile[]`
- `createSourceArchive(project) -> Buffer`
- `checkBuildRequirements(target) -> BuildCapability`
- `runBuild(projectId, emit) -> BuildResult`

- [ ] Define adapter contract and implement the first Fabric generator; leave other adapters visibly unsupported until real implementations exist.
- [ ] Generate metadata, mod initializer, item/block registrations, texture resources and recipes from validated project data using fixed templates.
- [ ] Add deterministic source ZIP export and safe, timed Gradle build invocation with bounded logs.
- [ ] Detect Java/Gradle capabilities and give clear install/configuration guidance while preserving all work.
- [ ] Show actual generated source and build output in the editor.

### Task 5: Run, refine and document

**Files:**
- Modify: `README.md`
- Modify: UI and service files as needed.

- [ ] Start the local server and inspect the workbench in the in-app browser at desktop and narrow widths.
- [ ] Verify project create/edit/save/reload, drawing-to-preview sync, source export and unauthenticated state manually.
- [ ] Inspect the full Git diff for leaked secrets, unsafe shell/file paths, false capability claims and Modspire overlap.
- [ ] Document setup, data locations, account consent and current build-runtime limitations.
