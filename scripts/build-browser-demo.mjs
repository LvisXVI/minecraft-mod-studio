import { cp, mkdir, readFile, writeFile } from 'node:fs/promises';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const destination = join(root, 'docs', 'demo');
await mkdir(destination, { recursive: true });
await cp(join(root, 'public'), destination, { recursive: true, force: true });
await cp(join(root, 'server', 'loader-version-fallback.json'), join(destination, 'loader-version-fallback.json'));
await cp(join(root, 'scripts', 'browser-demo-runtime.js'), join(destination, 'demo-api.js'));
const blockbenchPath = join(destination, 'blockbench.js');
await writeFile(blockbenchPath, `${(await readFile(blockbenchPath, 'utf8')).trimEnd()}\n`);

let html = await readFile(join(destination, 'index.html'), 'utf8');
html = html.replace('<html lang="de">', '<html lang="de" data-browser-demo="true">')
  .replaceAll('href="/favicon.svg"', 'href="./favicon.svg"')
  .replaceAll('href="/tailwind.css"', 'href="./tailwind.css"')
  .replaceAll('href="/styles.css"', 'href="./styles.css"')
  .replaceAll('href="/industrial.css"', 'href="./industrial.css"')
  .replaceAll('src="/app.js"', 'src="./app.js"')
  .replace('aria-label="ChatGPT-Konto verbinden"', 'aria-label="Demo-Mod-Assistent"')
  .replace('<option value="chatgpt">ChatGPT-Konto</option>', '<option value="chatgpt">Demo-Assistent</option>')
  .replaceAll('href="/" aria-label="Mod Studio Startseite"', 'href="../" aria-label="Zur Mod Studio Seite"')
  .replaceAll('Nur auf diesem Gerät', 'Nur in diesem Browser')
  .replace('<title>Mod Studio — Minecraft Java Creator</title>', '<title>Mod Studio ausprobieren — Browser-Testversion</title>')
  .replace('</head>', '    <link rel="stylesheet" href="./browser-demo.css">\n  </head>')
  .replace('<body>', `<body>
    <div class="browser-demo-banner"><span class="banner-copy"><strong>Browser-Testversion</strong> · KI-Vorschläge sind simuliert; echte Java-Builds gibt es in der Windows-App.</span><button id="reset-demo" type="button">Demo zurücksetzen</button><a href="../">Zur Produktseite</a></div>`)
  .replace('<script type="module" src="./app.js"></script>', `<script type="module">
      import { initializeBrowserDemo, resetBrowserDemo } from './demo-api.js';
      await initializeBrowserDemo();
      document.querySelector('#reset-demo').addEventListener('click', resetBrowserDemo);
      await import('./app.js');
    </script>`);
await writeFile(join(destination, 'index.html'), html);
await writeFile(join(destination, 'browser-demo.css'), `
.browser-demo-banner{position:fixed;z-index:30;inset:0 0 auto;min-height:42px;display:grid;grid-template-columns:minmax(0,1fr) auto auto;align-items:center;gap:10px;padding:6px 14px;border-bottom:1px solid #34402d;background:#10140d;color:#dfe8d4;font:11px/1.4 var(--mono)}
.browser-demo-banner .banner-copy{min-width:0;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;text-align:left}.browser-demo-banner strong{color:#c6ff4a}
.browser-demo-banner button,.browser-demo-banner a{min-height:28px;border:1px solid #3a4531;border-radius:6px;background:#171d12;color:#eef7e5;padding:4px 9px;font:inherit;text-decoration:none;cursor:pointer;white-space:nowrap}
.browser-demo-banner button:hover,.browser-demo-banner a:hover{border-color:#c6ff4a}
body{padding-top:42px}.app-shell{min-height:calc(100vh - 42px)}.sidebar{top:42px;height:calc(100vh - 42px)}
@media(max-width:760px){.browser-demo-banner{grid-template-columns:minmax(0,1fr) auto auto;gap:5px;padding-inline:7px;font-size:9px}.browser-demo-banner button,.browser-demo-banner a{padding-inline:6px;font-size:9px}}
@media(prefers-reduced-motion:reduce){.browser-demo-banner *{scroll-behavior:auto!important}}
`);

for (const file of ['tailwind.css', 'styles.css', 'industrial.css']) {
  const path = join(destination, file);
  const css = (await readFile(path, 'utf8')).replace(/url\((['"]?)\/(?!\/)/g, 'url($1./');
  await writeFile(path, css);
}

const apiPath = join(destination, 'api.js');
await writeFile(apiPath, `import { demoApi, demoFetch } from './demo-api.js';
export async function api(path, options = {}) { return demoApi(path, options); }
export function jsonBody(value) { return JSON.stringify(value); }
export async function apiFetch(path, options = {}) { return demoFetch(path, options); }
`);

const appPath = join(destination, 'app.js');
let app = await readFile(appPath, 'utf8');
app = app.replace("import { api, jsonBody } from './api.js';", "import { api, jsonBody, apiFetch } from './api.js';")
  .replaceAll('await fetch(', 'await apiFetch(')
  .replace("history.replaceState(null, '', `/?project=${encodeURIComponent(id)}`);", "history.replaceState(null, '', `${location.pathname}?project=${encodeURIComponent(id)}`);")
  .replace("'ChatGPT-Plan aktiv · Modell wählbar'", "'Demo-Assistent · simuliert'")
  .replace("'ChatGPT-Konto verbinden'", "'Demo-Mod-Assistent'")
  .replace("status.textContent=buildSupported?(runtimeReady?'BUILD BEREIT':'TOOLCHAIN FEHLT'):'BUILD-ADAPTER FEHLT';", "status.textContent=buildSupported?'BUILD NUR IN WINDOWS-APP':'ADAPTER GEPLANT';")
  .replace("'Verbinde ChatGPT oder nutze Ollama mit einem lokal installierten Modell.'", "'Du testest Beispielantworten. Deine Nachrichten verlassen diesen Browser nicht.'")
  .replace("nudge.querySelector('button').textContent=chatConnected&&!chatPlanEnabled?'ChatGPT-Plan freigeben':'ChatGPT verbinden';", "nudge.querySelector('button').textContent='Demo-Modus';")
  .replace("function connectChatGPT(){", "function connectChatGPT(){")
  .replace("async function connectChatGPT(){try{const result=await api('/api/auth/start',{method:'POST',body:'{}'});if(result.authorizationUrl){$('#assistant-state').textContent='Freigabe im Browser';}else{await refreshAuthStatus();toast('ChatGPT ist bereits verbunden.');}}catch(error){toast(error.message);}}", "async function connectChatGPT(){toast('In dieser Browser-Testversion wird keine ChatGPT-Anmeldung gestartet.');}");
const exportStart = app.indexOf('async function exportProject()');
const exportEnd = app.indexOf('\n', exportStart);
if (exportStart >= 0 && exportEnd > exportStart) {
  app = app.slice(0, exportStart) + "async function exportProject(){if(!project)return;downloadText(`${project.namespace}-browser-demo.json`,JSON.stringify({format:'Mod Studio Browser-Testversion',project},null,2),'application/json');toast('Projekt als JSON aus diesem Browser exportiert.');}" + app.slice(exportEnd);
}
app = app.replace("async function startBuild(){await refreshBuildStatus();", "async function startBuild(){await refreshBuildStatus();");
await writeFile(appPath, app);

let landing = await readFile(join(root, 'docs', 'index.html'), 'utf8');
landing = landing.replace('<a class="button primary" href="https://github.com/LvisXVI/minecraft-mod-studio/releases/latest">Mod Studio für Windows <span aria-hidden="true">↓</span></a><a class="button" href="#features">Vorschau ansehen <span aria-hidden="true">↘</span></a>', '<a class="button primary" href="demo/">Browser-Testversion öffnen <span aria-hidden="true">↗</span></a><a class="button" href="https://github.com/LvisXVI/minecraft-mod-studio/releases/latest">Windows-App herunterladen <span aria-hidden="true">↓</span></a>')
  .replace('Projekte und Zugangsdaten bleiben auf deinem Gerät.', 'Browser-Testversion: Projekte bleiben in diesem Browser. Für echte Java-Builds nutze die Windows-App.');
await writeFile(join(root, 'docs', 'index.html'), landing);

console.log(`Browser-Testversion erzeugt: ${destination}`);
