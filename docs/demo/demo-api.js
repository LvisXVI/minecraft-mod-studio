const STORAGE_KEY = 'modstudio.browser-demo.v1';
const STARTER_ID = 'a2f80d3c-13de-4d5b-9ddf-884c1ca53f43';
const VERSION_IDS = [
  '1.12.2','1.13','1.13.1','1.13.2','1.14','1.14.1','1.14.2','1.14.3','1.14.4',
  '1.15','1.15.1','1.15.2','1.16','1.16.1','1.16.2','1.16.3','1.16.4','1.16.5',
  '1.17','1.17.1','1.18','1.18.1','1.18.2','1.19','1.19.1','1.19.2','1.19.3','1.19.4',
  '1.20','1.20.1','1.20.2','1.20.3','1.20.4','1.20.5','1.20.6','1.21','1.21.1',
  '1.21.2','1.21.3','1.21.4','1.21.5','1.21.6','1.21.7','1.21.8','1.21.9','1.21.10','1.21.11',
  '26.1','26.1.1','26.1.2','26.2','26.3',
];
const LOADER_LABELS = { fabric: 'Fabric', quilt: 'Quilt', forge: 'Forge', neoforge: 'NeoForge' };
let fallbackVersions;

function readProjects() {
  try { return JSON.parse(localStorage.getItem(STORAGE_KEY) || '[]'); } catch { return []; }
}

function writeProjects(projects) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(projects));
}

function slug(value) {
  return String(value || 'neues_mod').normalize('NFKD').toLowerCase().replace(/[^a-z0-9_.-]+/g, '_').replace(/^[^a-z0-9]+/, '').slice(0, 48) || 'neues_mod';
}

function createStarter() {
  const now = new Date().toISOString();
  const pixels = Array(256).fill(null);
  const palette = ['#73E4C4', '#47B997', '#B8FF32', '#3E846F'];
  for (let y = 2; y < 14; y += 1) {
    for (let x = 2; x < 14; x += 1) {
      const distance = Math.abs(x - 7.5) + Math.abs(y - 7.5);
      if (distance < 8) pixels[y * 16 + x] = palette[(x + y) % palette.length];
    }
  }
  pixels[6 * 16 + 7] = '#F4F5F6'; pixels[7 * 16 + 8] = '#F4F5F6';
  const item = {
    id: crypto.randomUUID(), kind: 'item', name: 'Smaragdsplitter', identifier: 'smaragdsplitter',
    description: 'Ein leuchtender Splitter aus tiefen Höhlen.', properties: { maxStackSize: 32, fireResistant: true },
    texture: { size: 16, pixels }, recipes: [],
  };
  return {
    schemaVersion: 1, id: STARTER_ID, name: 'Beispiel: Kristallwerk', namespace: 'kristallwerk',
    description: 'Ein Beispielprojekt zum Ausprobieren des Editors.', target: { edition: 'java', loader: 'fabric', minecraftVersion: '26.2' },
    elements: [item], activeElementId: item.id, sourceOverrides: {}, conversation: [], timeSpentMs: 0,
    createdAt: now, updatedAt: now,
  };
}

export function resetBrowserDemo() {
  localStorage.removeItem(STORAGE_KEY);
  location.replace(location.pathname);
}

export async function initializeBrowserDemo() {
  const projects = readProjects();
  if (!projects.length) writeProjects([createStarter()]);
  const seeded = readProjects()[0];
  const url = new URL(location.href);
  if (!url.searchParams.has('project')) {
    url.searchParams.set('project', seeded.id);
    history.replaceState(null, '', `${url.pathname}${url.search}${url.hash}`);
  }
  try { fallbackVersions = await fetch(new URL('./loader-version-fallback.json', import.meta.url)).then((response) => response.json()); }
  catch { fallbackVersions = Object.fromEntries(Object.keys(LOADER_LABELS).map((loader) => [loader, VERSION_IDS])); }
}

function parseBody(options) {
  if (!options?.body || typeof options.body !== 'string') return options?.body || {};
  try { return JSON.parse(options.body); } catch { return {}; }
}

function summarize(project) {
  return { id: project.id, name: project.name, namespace: project.namespace, updatedAt: project.updatedAt, target: project.target, elementCount: project.elements.length, timeSpentMs: project.timeSpentMs };
}

function demoJava(project, element) {
  const safeName = element.identifier.replace(/(^|_)([a-z])/g, (_, separator, letter) => letter.toUpperCase()).replace(/[^A-Za-z0-9]/g, '') || 'NewItem';
  return `package ${project.namespace};\n\nimport net.minecraft.item.Item;\nimport net.minecraft.registry.Registries;\nimport net.minecraft.registry.Registry;\nimport net.minecraft.util.Identifier;\n\n/** Browser preview source for ${element.name}. */\npublic final class ${safeName} {\n    public static final Item INSTANCE = new Item(new Item.Settings()\n            .maxCount(${element.properties.maxStackSize ?? 64})\n            ${element.properties.fireResistant ? '.fireproof()' : ''});\n\n    public static void register() {\n        Registry.register(Registries.ITEM, Identifier.of("${project.namespace}", "${element.identifier}"), INSTANCE);\n    }\n}\n`;
}

function generatedFiles(project) {
  const element = project.elements.find((entry) => entry.id === project.activeElementId) || project.elements[0];
  if (!element) return [];
  const className = element.identifier.replace(/(^|_)([a-z])/g, (_, separator, letter) => letter.toUpperCase()).replace(/[^A-Za-z0-9]/g, '') || 'NewItem';
  return [
    { path: `src/main/java/${project.namespace}/${className}.java`, content: project.sourceOverrides?.[`src/main/java/${project.namespace}/${className}.java`] || demoJava(project, element) },
    { path: 'src/main/resources/fabric.mod.json', content: JSON.stringify({ schemaVersion: 1, id: project.namespace, version: '1.0.0', name: project.name, environment: '*', entrypoints: { main: [`${project.namespace}.ModEntry`] } }, null, 2) },
    { path: 'build.gradle', content: `plugins { id 'fabric-loom' version '<wird beim echten Projekt aufgelöst>' }\n// Browser-Testversion: Dieser Entwurf startet keinen Minecraft-Build.\n` },
  ];
}

function makeElement(project, message) {
  const kind = /\b(block|blocke|blocken|erz)\b/i.test(message) ? 'block' : 'item';
  const label = kind === 'block' ? 'Neuer Block' : 'Neues Item';
  const identifier = (message.match(/(?:namens?|heißt|ist)\s+([\p{L}\d_-]{2,36})/iu)?.[1] || label.toLowerCase().replaceAll(' ', '_'))
    .normalize('NFKD').toLowerCase().replace(/[^a-z0-9_.-]+/g, '_').replace(/^[^a-z0-9]+/, '').slice(0, 48) || 'neues_item';
  const colors = ['#72D9BD', '#49A88E', '#B8FF32', '#2D6559'];
  const pixels = Array(256).fill(null);
  for (let y = 3; y < 13; y += 1) for (let x = 3; x < 13; x += 1) {
    if (Math.abs(x - 7.5) + Math.abs(y - 7.5) < 7) pixels[y * 16 + x] = colors[(x + y) % colors.length];
  }
  return {
    id: crypto.randomUUID(), kind, name: identifier.split(/[_-]/).map((part) => part ? part[0].toUpperCase() + part.slice(1) : '').join(' ') || label,
    identifier, description: message.slice(0, 500), properties: kind === 'block'
      ? { hardness: 2, resistance: 3, requiresTool: false, luminance: 4 }
      : { maxStackSize: 64, fireResistant: false }, texture: { size: 16, pixels }, recipes: [],
  };
}

async function catalog() {
  const versions = VERSION_IDS.slice().reverse();
  const loaders = Object.entries(LOADER_LABELS).map(([id, label]) => ({
    id, label, status: id === 'fabric' ? 'supported' : 'planned',
    versions: (fallbackVersions?.[id] || versions).filter((version) => versions.includes(version)).sort((a, b) => b.localeCompare(a, undefined, { numeric: true })),
    buildVersions: id === 'fabric' ? ['26.2'] : [],
  }));
  return { defaultLoader: 'fabric', defaultVersion: '26.2', minimumVersion: '1.12.2', latestVersion: '26.3', versions, loaders, runtime: { ready: false, java: null, gradle: null } };
}

function sse(event, data) { return `event: ${event}\ndata: ${JSON.stringify(data)}\n\n`; }

async function route(path, options = {}) {
  const method = options.method || 'GET';
  const body = parseBody(options);
  const projects = readProjects();
  if (path === '/api/projects' && method === 'GET') return { projects: projects.map(summarize) };
  if (path === '/api/projects' && method === 'POST') {
    const now = new Date().toISOString();
    const project = { schemaVersion: 1, id: crypto.randomUUID(), name: String(body.name || 'Neues Mod-Projekt').slice(0, 72), namespace: slug(body.name), description: String(body.description || '').slice(0, 1000), target: { edition: 'java', loader: 'fabric', minecraftVersion: '26.2' }, elements: [], activeElementId: null, sourceOverrides: {}, conversation: [], timeSpentMs: 0, createdAt: now, updatedAt: now };
    writeProjects([project, ...projects]);
    return { project };
  }
  if (path === '/api/capabilities') return catalog();
  if (path === '/api/updates') return { currentVersion: 'Browser-Testversion', latestVersion: 'Browser-Testversion', updateAvailable: false, releaseNotes: '' };
  if (path === '/api/updates/install') throw new Error('Updates sind in der Browser-Testversion nicht verfügbar.');
  if (path === '/api/auth/status') return { connected: true, planUsageEnabled: true, label: 'Demo-Mod-Assistent', detail: 'Beispielantworten · keine Anmeldung' };
  if (path === '/api/ai/providers') return { ollama: { models: [] } };
  if (path === '/api/auth/models') return { selectedModel: 'demo', models: [{ id: 'demo', name: 'Beispielmodell · simuliert' }] };
  if (path === '/api/auth/model') return { selectedModel: 'demo' };
  const match = path.match(/^\/api\/projects\/([0-9a-f-]{36})(?:\/(.+))?$/i);
  if (!match) throw new Error('Diese Aktion ist in der Browser-Testversion nicht enthalten.');
  const [, id, action] = match;
  const index = projects.findIndex((entry) => entry.id === id);
  if (index < 0) throw new Error('Das Projekt ist nicht mehr vorhanden.');
  const project = projects[index];
  if (!action && method === 'GET') return { project };
  if (!action && method === 'PUT') {
    const updated = { ...body, updatedAt: new Date().toISOString() };
    projects[index] = updated; writeProjects(projects); return { project: updated };
  }
  if (action === 'files' && method === 'GET') return { files: generatedFiles(project) };
  if (action === 'build' && method === 'GET') return { ready: false, supported: false, artifactAvailable: false, message: 'Der Browser kann keine Java-/Gradle-Laufzeit starten. Öffne die Windows-App, um ein echtes Minecraft-JAR zu bauen.' };
  if (action === 'ai' && method === 'PUT') {
    if (body.project?.id !== id) throw new Error('Der Vorschlag gehört nicht zu diesem Projekt.');
    projects[index] = body.project; writeProjects(projects); return { project: body.project };
  }
  if (action === 'ai' && method === 'POST') {
    const candidate = structuredClone(project);
    const element = makeElement(candidate, body.message || 'Ein Beispiel-Item');
    candidate.elements.push(element); candidate.activeElementId = element.id;
    const readable = 'Das ist ein simulierter Demo-Vorschlag. Er erstellt ein editierbares Beispiel-Element mit Textur, damit du den Übernehmen- und Bearbeiten-Ablauf testen kannst.';
    const createdAt = new Date().toISOString();
    candidate.conversation = [...candidate.conversation, { role: 'user', content: body.message, createdAt }, { role: 'assistant', content: readable, createdAt }];
    return { stream: sse('candidate', { message: readable, project: candidate }) };
  }
  throw new Error('Diese Aktion ist in der Browser-Testversion nicht verfügbar.');
}

export async function demoApi(path, options = {}) { return route(path, options); }

export async function demoFetch(path, options = {}) {
  try {
    const result = await route(new URL(path, location.href).pathname, options);
    if (result?.stream) return new Response(result.stream, { status: 200, headers: { 'Content-Type': 'text/event-stream' } });
    return new Response(JSON.stringify(result), { status: 200, headers: { 'Content-Type': 'application/json' } });
  } catch (error) {
    return new Response(JSON.stringify({ error: error.message }), { status: 400, headers: { 'Content-Type': 'application/json' } });
  }
}
