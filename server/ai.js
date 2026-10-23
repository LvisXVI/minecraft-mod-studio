import { spawn } from 'node:child_process';
import { access } from 'node:fs/promises';
import { join } from 'node:path';
import { validateProject } from './schema.js';
import { preserveBlockbenchModels } from './blockbench.js';

let ollamaStartup = null;
let managedOllamaProcess = null;

export function createAiService(auth, store) {
  return {
    async providers() {
      const chatgpt = await auth.status();
      const localModels = await ensureOllama();
      return { chatgpt, ollama: { connected: localModels.length > 0, models: localModels } };
    },
    async stream(req, res, project, body) {
      const message = typeof body?.message === 'string' ? body.message.trim().slice(0, 6000) : '';
      if (!message) throw new Error('Schreibe zuerst eine Nachricht.');
      const provider = body?.provider === 'ollama' ? 'ollama' : 'chatgpt';
      const priorMessages = project.conversation.slice(-18);
      const lastMessage = priorMessages.at(-1);
      const conversation = [...priorMessages, ...(lastMessage?.role === 'user' && lastMessage.content === message ? [] : [{ role: 'user', content: message }])].map(({ role, content }) => ({ role, content }));
      const system = `Du bist Mod Studio, ein Assistent für Minecraft-Java-Mods. Antworte ausschließlich mit einem JSON-Objekt mit genau zwei Feldern: "message" (deine kurze deutsche Antwort) und "project" (das vollständige aktualisierte Projekt-JSON). Verändere nur Minecraft-Moddaten, die der Nutzer verlangt. Bewahre Projekt-ID, Name, Namespace, Ziel, alle anderen Elemente und unveränderte Werte. Erfinde keine nicht unterstützten Loader oder Spielversionen. Der aktuell verifizierte Build unterstützt Fabric 26.2 mit Items und Blöcken; behalte dieses Ziel bei. Du kannst Texturpixel als exaktes 16×16-Array passend zur beschriebenen Idee erzeugen und überarbeiten. Verwende keine beliebigen Füllmuster: jeder Pixel soll Form, Material, Kontur oder Licht der konkreten Beschreibung unterstützen. Item-Eigenschaften: Stapelgröße und Feuerresistenz. Block-Eigenschaften: Härte, Widerstand, Lichtstärke und Werkzeuganforderung. Texturpixel sind exakt 256 Werte, jeweils null oder #RRGGBB. Elementfelder: id, kind (item oder block), name, identifier, description, properties, texture:{size:16,pixels}, recipes. Rezepte nur ändern, wenn der Nutzer es verlangt. Erzeuge keine Java-/Gradle-Skripte. Aktuelles Projekt: ${JSON.stringify(project)}`;
      const emit = (event, data) => { if (!res.destroyed) res.write(`event: ${event}\ndata: ${JSON.stringify(data)}\n\n`); };
      res.writeHead(200, { 'Content-Type': 'text/event-stream; charset=utf-8', 'Cache-Control': 'no-cache', Connection: 'keep-alive' });
      let finalText;
      if (provider === 'ollama') {
        const models = await ensureOllama();
        const model = typeof body.model === 'string' && models.some((entry) => entry.name === body.model) ? body.model : models[0]?.name;
        if (!model) throw new Error('Ollama ist lokal nicht erreichbar oder es wurde noch kein Modell installiert.');
        const activeElement = project.elements.find((element) => element.id === project.activeElementId);
        if (!activeElement) throw new Error('Lege zuerst ein Item oder einen Block an, damit das lokale Modell die passende Skizze bearbeiten kann.');
        const localSystem = `Du bearbeitest genau ein ausgewähltes Minecraft-Java-Mod-Element. Antworte ausschließlich als JSON mit "message" (kurze deutsche Antwort) und "element" (vollständiges Element-JSON). Verwende diese unveränderten Werte: Element-ID ${activeElement.id}, Typ ${activeElement.kind}, Kennung ${activeElement.identifier}. Ändere nur Eigenschaften, die der Nutzer verlangt; behalte Name, Kennung, Beschreibung, Eigenschaften und Rezepte ansonsten exakt bei. Bei einem Texturauftrag zeichne anhand der konkreten Beschreibung eine erkennbare, detaillierte Pixelgrafik: klare Silhouette oder Materialstruktur, dunkle Kontur/Schatten, zwei passende Grund-/Mitteltöne und gezielte helle Highlights. Item-Hintergrund transparent (.), Block-Fläche gefüllt. In texture.palette stehen exakt vier Farben: Index 0 Kontur/Schatten, 1 Grundfarbe, 2 Material/Schattierung, 3 Licht/Glanz. texture.rows enthält genau 16 Zeilen à 16 Zeichen; jedes Zeichen ist 0, 1, 2, 3 oder . (transparent). Gestalte die Pixelreihen wie echte Minecraft-Pixelkunst passend zur Beschreibung; mindestens 24 sichtbare Pixel und mindestens drei verwendete Palettenfarben, sofern die Idee nicht ausdrücklich leer/transparent sein soll. Keine flache Einheitsfarbe, kein Zufallsmuster und kein Schachbrett. Das Serverprogramm wandelt diese Skizze in die exakt 256 editierbaren Pixel um. Verwende beim Block Eigenschaften hardness, resistance, requiresTool und luminance; beim Item maxStackSize und fireResistant. Ändere Rezepte nur auf ausdrücklichen Wunsch. Aktuelles ausgewähltes Element: ${JSON.stringify(activeElement)}. Mod-Ziel: Minecraft Java ${project.target.minecraftVersion}, ${project.target.loader}.`;
        const response = await fetch('http://127.0.0.1:11434/api/chat', {
          method: 'POST', headers: { 'Content-Type': 'application/json' }, signal: AbortSignal.timeout(300_000),
          body: JSON.stringify({ model, messages: [{ role: 'system', content: localSystem }, ...conversation], format: localElementSchema(activeElement), stream: false, options: { temperature: 0.4, num_ctx: 8192, num_predict: 2048 } }),
        });
        const result = await response.json().catch(() => ({}));
        if (!response.ok || typeof result.message?.content !== 'string') throw new Error('Die lokale Ollama-Anfrage konnte nicht abgeschlossen werden.');
        const update = parseLocalUpdate(result.message.content, activeElement);
        const updatedProject = preserveBlockbenchModels({ ...project, elements: project.elements.map((element) => element.id === activeElement.id ? update.element : element) }, project);
        const candidate = { message: update.message, project: validateProject(updatedProject) };
        const savedLastMessage = project.conversation.at(-1);
        candidate.project.conversation = [...project.conversation, ...(savedLastMessage?.role === 'user' && savedLastMessage.content === message ? [] : [{ role: 'user', content: message, createdAt: new Date().toISOString() }]), { role: 'assistant', content: candidate.message, createdAt: new Date().toISOString() }].slice(-100);
        emit('candidate', candidate);
        emit('complete', { ok: true, provider }); res.end();
        return;
      } else {
        const token = await auth.accessToken();
        const model = body.model || await auth.getModel();
        if (!model) throw new Error('Für dieses ChatGPT-Konto ist gerade kein Modell verfügbar.');
        const response = await fetch('https://api.openai.com/v1/responses', {
          method: 'POST', headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
          body: JSON.stringify({ model, input: [{ role: 'system', content: system }, ...conversation], store: false, stream: true }),
        });
        if (!response.ok || !response.body) throw new Error(`ChatGPT-Anfrage fehlgeschlagen (${response.status}).`);
        const reader = response.body.getReader(); const decoder = new TextDecoder(); let buffer = ''; let output = ''; let completed = false;
        while (true) {
          const { value, done } = await reader.read(); if (done) break;
          buffer += decoder.decode(value, { stream: true });
          const events = buffer.split('\n\n'); buffer = events.pop() || '';
          for (const raw of events) {
            const dataLine = raw.split('\n').find((line) => line.startsWith('data: ')); if (!dataLine) continue;
            let event; try { event = JSON.parse(dataLine.slice(6)); } catch { continue; }
            if (event.type === 'response.output_text.delta') { output += event.delta || ''; emit('delta', { text: event.delta || '' }); }
            if (event.type === 'response.failed' || event.type === 'error') throw new Error(event.response?.error?.message || event.error?.message || 'Die Antwort konnte nicht abgeschlossen werden.');
            if (event.type === 'response.completed') { completed = true; finalText = event.response?.output_text || output; }
          }
        }
        if (!completed) throw new Error('Die Antwort wurde vor dem Abschluss unterbrochen.');
      }
      const candidate = parseCandidate(finalText, project);
      const savedLastMessage = project.conversation.at(-1);
      candidate.project.conversation = [...project.conversation, ...(savedLastMessage?.role === 'user' && savedLastMessage.content === message ? [] : [{ role: 'user', content: message, createdAt: new Date().toISOString() }]), { role: 'assistant', content: candidate.message, createdAt: new Date().toISOString() }].slice(-100);
      candidate.project = validateProject(preserveBlockbenchModels(candidate.project, project));
      emit('candidate', candidate);
      emit('complete', { ok: true, provider }); res.end();
    },
    async apply(projectId, candidate) {
      const current = await store.read(projectId);
      if (candidate?.id !== current.id) throw new Error('Der KI-Vorschlag gehört nicht zu diesem Projekt.');
      return store.write(projectId, validateProject(preserveBlockbenchModels(candidate, current)));
    },
    close() {
      if (managedOllamaProcess && !managedOllamaProcess.killed) managedOllamaProcess.kill();
      managedOllamaProcess = null;
    },
  };
}

async function listOllamaModels() {
  try {
    const response = await fetch('http://127.0.0.1:11434/api/tags', { signal: AbortSignal.timeout(1800) });
    if (!response.ok) return [];
    const result = await response.json();
    return (result.models || []).filter((model) => typeof model.name === 'string').map((model) => ({ name: model.name, size: model.size || 0 }));
  } catch { return []; }
}

async function ensureOllama() {
  let models = await listOllamaModels();
  if (models.length || process.platform !== 'win32') return models;
  if (!ollamaStartup) ollamaStartup = startOllama().finally(() => { ollamaStartup = null; });
  if (!await ollamaStartup) return [];
  for (let attempt = 0; attempt < 12; attempt += 1) {
    await new Promise((resolve) => setTimeout(resolve, 500));
    models = await listOllamaModels();
    if (models.length) return models;
  }
  return [];
}

async function startOllama() {
  const candidates = [
    process.env.LOCALAPPDATA && join(process.env.LOCALAPPDATA, 'Programs', 'Ollama', 'ollama.exe'),
    'C:\\Program Files\\Ollama\\ollama.exe',
  ].filter(Boolean);
  let executable = null;
  for (const candidate of candidates) {
    try { await access(candidate); executable = candidate; break; } catch { /* try the next standard install location */ }
  }
  if (!executable) return false;
  try {
    managedOllamaProcess = spawn(executable, ['serve'], {
      detached: true, stdio: 'ignore', windowsHide: true,
      env: { ...process.env, OLLAMA_HOST: '127.0.0.1:11434' },
    });
    managedOllamaProcess.once('error', () => { managedOllamaProcess = null; });
    managedOllamaProcess.unref();
    return true;
  } catch { managedOllamaProcess = null; return false; }
}

function parseCandidate(text, currentProject) {
  let parsed;
  try { parsed = JSON.parse(String(text).trim().replace(/^```(?:json)?\s*/i, '').replace(/\s*```$/, '')); }
  catch { throw new Error('Die KI-Antwort war kein gültiger Mod-Vorschlag. Deine Mod blieb unverändert.'); }
  if (typeof parsed.message !== 'string' || !parsed.project || parsed.project.id !== currentProject.id) throw new Error('Die KI-Antwort enthielt keinen passenden Projektvorschlag. Deine Mod blieb unverändert.');
  return { message: parsed.message.slice(0, 4000), project: validateProject(preserveBlockbenchModels(parsed.project, currentProject)) };
}

function parseLocalUpdate(text, currentElement) {
  let parsed;
  try { parsed = JSON.parse(String(text).trim().replace(/^```(?:json)?\s*/i, '').replace(/\s*```$/, '')); }
  catch { throw new Error('Das lokale Modell hat kein gültiges Element-JSON geliefert. Deine Mod blieb unverändert.'); }
  if (typeof parsed.message !== 'string' || !parsed.element || parsed.element.id !== currentElement.id) throw new Error('Das lokale Modell hat keinen passenden Elementvorschlag geliefert. Deine Mod blieb unverändert.');
  const sourceTexture = parsed.element.texture;
  if (sourceTexture?.size !== 16 || !Array.isArray(sourceTexture.palette) || sourceTexture.palette.length !== 4 || !Array.isArray(sourceTexture.rows) || sourceTexture.rows.length !== 16) throw new Error('Die lokale Skizze hatte nicht das erwartete 16×16-Raster. Deine Mod blieb unverändert.');
  const palette = sourceTexture.palette.map((color) => String(color));
  if (palette.some((color) => !/^#[\da-fA-F]{6}$/.test(color))) throw new Error('Die lokale Skizze enthielt eine ungültige Farbe. Deine Mod blieb unverändert.');
  if (sourceTexture.rows.some((row) => typeof row !== 'string' || !/^[0-3.]{16}$/.test(row))) throw new Error('Die lokale Skizze enthielt eine ungültige Pixelzeile. Deine Mod blieb unverändert.');
  const mask = sourceTexture.rows.join('').split('').map((value) => value !== '.');
  const symbols = sourceTexture.rows.join('').split('');
  const usedSymbols = new Set(symbols.filter((value) => value !== '.'));
  const width = 16; const height = 16;
  const xs = symbols.flatMap((symbol, i) => symbol === '.' ? [] : [i % width]);
  const ys = symbols.flatMap((symbol, i) => symbol === '.' ? [] : [Math.floor(i / width)]);
  const center = xs.length ? (Math.min(...xs) + Math.max(...xs)) / 2 : 7.5;
  const top = ys.length ? Math.min(...ys) : 0;
  const pixels = symbols.map((value, index) => {
    if (value === '.' && currentElement.kind === 'item') return null;
    if (value === '.' && currentElement.kind === 'block') return palette[1].toUpperCase();
    const x = index % width; const y = Math.floor(index / width);
    const isEdge = [[x - 1, y], [x + 1, y], [x, y - 1], [x, y + 1]].some(([nx, ny]) => nx < 0 || ny < 0 || nx >= width || ny >= height || !mask[ny * width + nx]);
    if (usedSymbols.size > 2) return palette[Number(value)].toUpperCase();
    // Small local models often use one palette symbol for a whole silhouette. Derive clean facets from that model-generated shape and palette.
    if (isEdge) return palette[0].toUpperCase();
    if (x < center && y > top + 1) return palette[2].toUpperCase();
    if (x > center && y < top + 7) return palette[3].toUpperCase();
    return palette[1].toUpperCase();
  });
  if (pixels.filter(Boolean).length < 24 || new Set(pixels.filter(Boolean)).size < 3) throw new Error('Die lokale Skizze war zu flach oder unvollständig. Deine Mod blieb unverändert; formuliere die Material- oder Farbdetails konkreter.');
  return { message: parsed.message.slice(0, 4000), element: { ...parsed.element, texture: { size: 16, pixels } } };
}

function localElementSchema(element) {
  const properties = element.kind === 'block'
    ? { hardness: { type: 'number' }, resistance: { type: 'number' }, requiresTool: { type: 'boolean' }, luminance: { type: 'number' } }
    : { maxStackSize: { type: 'integer' }, fireResistant: { type: 'boolean' } };
  const requiredProperties = Object.keys(properties);
  return {
    type: 'object', additionalProperties: false, required: ['message', 'element'],
    properties: {
      message: { type: 'string' },
      element: {
        type: 'object', additionalProperties: false,
        required: ['id', 'kind', 'name', 'identifier', 'description', 'properties', 'texture', 'recipes'],
        properties: {
          id: { type: 'string', enum: [element.id] },
          kind: { type: 'string', enum: [element.kind] },
          name: { type: 'string' }, identifier: { type: 'string' }, description: { type: 'string' },
          properties: { type: 'object', additionalProperties: false, required: requiredProperties, properties },
          texture: {
            type: 'object', additionalProperties: false, required: ['size', 'palette', 'rows'],
            properties: {
              size: { type: 'integer', enum: [16] },
              palette: { type: 'array', minItems: 4, maxItems: 4, items: { type: 'string', pattern: '^#[0-9a-fA-F]{6}$' } },
              rows: { type: 'array', minItems: 16, maxItems: 16, items: { type: 'string', pattern: '^[0-3.]{16}$' } },
            },
          },
          recipes: { type: 'array', items: { type: 'object' } },
        },
      },
    },
  };
}
