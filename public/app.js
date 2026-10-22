import { api, jsonBody } from './api.js';
import { createPixelEditor, renderVoxelPreview } from './editor.js';

const $ = (selector) => document.querySelector(selector);
const projectList = $('#project-list');
const projectCount = $('#project-count');
const emptyState = $('#empty-state');
const workbench = $('#workbench');
const dialog = $('#new-project-dialog');
let project = null;
let selectedId = null;
let dirtyTimer;
let editor;
let previewRotation = 0;
let currentView = 'design';
let chatConnected = false;
let localModels = [];
let chatModels = [];
let selectedChatModel = null;
let currentSourcePath = null;

async function initialize() {
  wireShell();
  await refreshProjects();
  const params = new URLSearchParams(location.search);
  const wanted = params.get('project');
  const projects = await api('/api/projects').catch(() => ({ projects: [] }));
  if (wanted && projects.projects.some((entry) => entry.id === wanted)) await selectProject(wanted);
  await refreshCapabilityLabel();
  await refreshAuthStatus();
}

function wireShell() {
  $('#new-project-button').addEventListener('click', openNewProject);
  $('#empty-create-button').addEventListener('click', openNewProject);
  $('#add-first-element').addEventListener('click', () => addElement('item'));
  $('#add-element-button').addEventListener('click', () => addElement('item'));
  $('#add-block-button').addEventListener('click', () => addElement('block'));
  $('#delete-element-button').addEventListener('click', deleteSelectedElement);
  $('#new-project-form').addEventListener('submit', createProject);
  $('#cancel-dialog-button').addEventListener('click', () => dialog.close());
  $('#close-dialog-button').addEventListener('click', () => dialog.close());
  $('#export-button').addEventListener('click', exportProject);
  $('#undo-button').addEventListener('click', () => editor?.undo());
  $('#redo-button').addEventListener('click', () => editor?.redo());
  $('#clear-canvas-button').addEventListener('click', () => editor?.clear());
  $('#rotate-preview-button').addEventListener('click', () => { previewRotation = (previewRotation + 1) % 4; drawPreview(); });
  $('#color-picker').addEventListener('input', (event) => { editor?.setColor(event.target.value); $('#color-swatch').style.background = event.target.value; });
  document.querySelectorAll('[data-tool]').forEach((button) => button.addEventListener('click', () => {
    document.querySelectorAll('[data-tool]').forEach((item) => item.classList.toggle('selected', item === button)); editor?.setTool(button.dataset.tool);
  }));
  document.querySelectorAll('.mode-tab').forEach((button) => button.addEventListener('click', () => showView(button.dataset.view)));
  $('#refresh-source-button').addEventListener('click', refreshSource);
  $('#code-output').addEventListener('input', () => {
    if (!project || !currentSourcePath?.endsWith('.java')) return;
    project.sourceOverrides[currentSourcePath] = $('#code-output').value;
    scheduleSave();
  });
  $('#loader-select').addEventListener('change', changeTarget);
  $('#version-select').addEventListener('change', changeTarget);
  $('#element-name').addEventListener('input', updateElementField);
  $('#element-identifier').addEventListener('input', updateElementField);
  $('#element-description').addEventListener('input', updateElementDescription);
  $('#account-button').addEventListener('click', connectChatGPT);
  $('#connect-chat-button').addEventListener('click', connectChatGPT);
  $('#send-chat-button').addEventListener('click', sendMessage);
  $('#ai-provider-select').addEventListener('change', refreshAiModelChoices);
  $('#chat-input').addEventListener('keydown', (event) => { if (event.key === 'Enter' && !event.shiftKey) { event.preventDefault(); sendMessage(); } });
  document.querySelectorAll('[data-prompt]').forEach((button) => button.addEventListener('click', () => { $('#chat-input').value = button.dataset.prompt; $('#chat-input').focus(); }));
  $('#build-button').addEventListener('click', startBuild);
  $('#assistant-menu-button').addEventListener('click', () => toast('Der Chat bleibt im Projekt gespeichert.'));
  window.addEventListener('focus', refreshAuthStatus);
  document.addEventListener('keydown', (event) => {
    if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === 's') { event.preventDefault(); saveNow(); }
    if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === 'k') { event.preventDefault(); openNewProject(); }
    if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === 'z') { event.preventDefault(); editor?.undo(); }
  });
}

function openNewProject() { $('#project-name-input').value = 'Neues Mod-Projekt'; $('#project-description-input').value = ''; dialog.showModal(); $('#project-name-input').select(); }

async function createProject(event) {
  event.preventDefault();
  const name = $('#project-name-input').value.trim() || 'Neues Mod-Projekt';
  try {
    const result = await api('/api/projects', { method: 'POST', body: jsonBody({ name, description: $('#project-description-input').value.trim(), target: { loader: 'fabric', minecraftVersion: '26.2' } }) });
    dialog.close(); await refreshProjects(); await selectProject(result.project.id);
  } catch (error) { toast(error.message); }
}

async function refreshProjects() {
  const { projects } = await api('/api/projects');
  projectCount.textContent = String(projects.length);
  if (!projects.length) { projectList.innerHTML = '<p class="sidebar-empty">Deine Mods erscheinen hier.</p>'; return; }
  projectList.replaceChildren(...projects.map((item) => {
    const button = document.createElement('button'); button.type = 'button'; button.className = `project-link${item.id === selectedId ? ' active' : ''}`;
    button.innerHTML = `<span class="project-glyph">${escapeHtml(item.name.slice(0, 1).toUpperCase())}</span><span class="project-link-copy"><strong></strong><small></small></span><span class="project-link-count"></span>`;
    button.querySelector('strong').textContent = item.name; button.querySelector('small').textContent = `${item.target.loader} · ${item.target.minecraftVersion || 'Version wählen'}`; button.querySelector('.project-link-count').textContent = item.elementCount;
    button.addEventListener('click', () => selectProject(item.id)); return button;
  }));
}

async function selectProject(id) {
  try {
    const result = await api(`/api/projects/${id}`); project = result.project; selectedId = id;
    emptyState.hidden = true; workbench.hidden = false; $('#target-controls').hidden = false; $('#project-title').textContent = project.name;
    $('#loader-select').value = project.target.loader; $('#version-select').value = project.target.minecraftVersion || '26.2';
    $('#namespace-prefix').textContent = `${project.namespace}:`;
    renderChat(); renderElements(); await refreshProjects();
    if (editor) editor.destroy();
    editor = createPixelEditor($('#pixel-canvas'), project.elements.find((item) => item.id === project.activeElementId)?.texture || { size: 16, pixels: Array(256).fill(null) }, onTextureChange);
    renderPalette(); updateSelection();
    history.replaceState(null, '', `/?project=${encodeURIComponent(id)}`);
    setSaveStatus('Gespeichert');
  } catch (error) { toast(error.message); }
}

function selectedElement() { return project?.elements.find((item) => item.id === project.activeElementId) || null; }

async function addElement(kind) {
  if (!project) return;
  const count = project.elements.filter((item) => item.kind === kind).length;
  const element = { id: crypto.randomUUID(), kind, name: `${kind === 'block' ? 'Neuer Block' : 'Neues Item'}${count ? ` ${count + 1}` : ''}`, identifier: `${kind === 'block' ? 'new_block' : 'new_item'}${count ? `_${count + 1}` : ''}`, description: '', properties: kind === 'block' ? { hardness: 2, resistance: 3, requiresTool: false, luminance: 0 } : { maxStackSize: 64, fireResistant: false }, texture: { size: 16, pixels: Array(256).fill(null) }, recipes: [] };
  project.elements.push(element); project.activeElementId = element.id; renderElements(); updateSelection(); await saveNow();
  document.querySelector('.add-first-element').hidden = true;
}

function renderElements() {
  const tabs = $('#element-tabs'); const assets = $('#asset-list');
  tabs.replaceChildren(); assets.replaceChildren();
  for (const element of project.elements) {
    const tab = document.createElement('button'); tab.className = `element-tab${element.id === project.activeElementId ? ' active' : ''}`; tab.type = 'button'; tab.setAttribute('role', 'tab'); tab.textContent = `${element.kind === 'block' ? '▦' : '◇'} ${element.name}`;
    tab.addEventListener('click', async () => { project.activeElementId = element.id; editor.setTexture(element.texture); renderElements(); updateSelection(); await saveNow(); }); tabs.append(tab);
    const item = document.createElement('button'); item.type = 'button'; item.className = `asset-item${element.id === project.activeElementId ? ' active' : ''}`; item.innerHTML = '<canvas width="32" height="32"></canvas><span><strong></strong><small></small></span>';
    item.querySelector('strong').textContent = element.name; item.querySelector('small').textContent = `${element.kind} · ${element.identifier}`; paintThumbnail(item.querySelector('canvas'), element.texture.pixels); item.addEventListener('click', () => tab.click()); assets.append(item);
  }
  $('#asset-count').textContent = `${project.elements.length} ${project.elements.length === 1 ? 'Element' : 'Elemente'}`;
  $('#add-first-element').hidden = project.elements.length > 0;
}

async function deleteSelectedElement() {
  const element = selectedElement();
  if (!element || !window.confirm(`„${element.name}“ aus diesem Mod-Projekt entfernen?`)) return;
  project.elements = project.elements.filter((item) => item.id !== element.id);
  project.activeElementId = project.elements[0]?.id || null;
  renderElements();
  updateSelection();
  editor?.setTexture(selectedElement()?.texture || { size: 16, pixels: Array(256).fill(null) });
  await saveNow();
}

function updateSelection() {
  const element = selectedElement();
  $('#delete-element-button').hidden = !element;
  $('#selected-element-label').textContent = element ? `${element.kind === 'block' ? 'BLOCK' : 'ITEM'} / ${element.identifier}` : 'Noch kein Element';
  $('#element-inspector').hidden = !element; $('#element-name').value = element?.name || ''; $('#element-identifier').value = element?.identifier || ''; $('#element-description').value = element?.description || '';
  $('#item-properties').replaceChildren();
  if (element?.kind === 'item') {
    const label = document.createElement('label'); label.className = 'property-toggle'; label.innerHTML = '<span><strong>Stapelgröße</strong><small>Anzahl pro Inventar-Slot</small></span><input type="number" min="1" max="99" value="64">';
    label.querySelector('input').value = element.properties.maxStackSize; label.querySelector('input').addEventListener('change', (event) => { element.properties.maxStackSize = Math.max(1, Math.min(99, Number(event.target.value) || 64)); scheduleSave(); }); $('#item-properties').append(label);
    const fire = document.createElement('label'); fire.className = 'property-toggle'; fire.innerHTML = '<span><strong>Feuerfest</strong><small>Verbrennt nicht in Lava oder Feuer</small></span><input type="checkbox">';
    fire.querySelector('input').checked = Boolean(element.properties.fireResistant); fire.querySelector('input').addEventListener('change', (event) => { element.properties.fireResistant = event.target.checked; scheduleSave(); }); $('#item-properties').append(fire);
  } else if (element?.kind === 'block') {
    for (const [key, labelText, min, max] of [['hardness','Härte',0,100],['resistance','Sprengfestigkeit',0,1000],['luminance','Lichtstärke',0,15]]) {
      const label = document.createElement('label'); label.className = 'field-label compact'; label.textContent = labelText; const input = document.createElement('input'); input.type='number'; input.min=min; input.max=max; input.value=element.properties[key]; input.addEventListener('change',()=>{element.properties[key]=Math.max(min,Math.min(max,Number(input.value)||0));scheduleSave();}); label.append(input); $('#item-properties').append(label);
    }
  }
  drawPreview();
}

function updateElementField() {
  const element = selectedElement(); if (!element) return;
  element.name = $('#element-name').value.slice(0, 72);
  element.identifier = $('#element-identifier').value.toLowerCase().replace(/[^a-z0-9_.-]/g, '_').slice(0, 48);
  renderElements(); updateSelection(); scheduleSave();
}

function updateElementDescription() {
  const element = selectedElement();
  if (!element) return;
  element.description = $('#element-description').value.slice(0, 500);
  scheduleSave();
}

function onTextureChange(texture) { const element = selectedElement(); if (!element) return; element.texture = texture; drawPreview(); renderElements(); scheduleSave(); }
function drawPreview() { const element = selectedElement(); renderVoxelPreview($('#voxel-canvas'), element?.texture?.pixels || Array(256).fill(null), element, previewRotation); $('#preview-empty').hidden = Boolean(element && element.texture.pixels.some(Boolean)); }
function renderPalette() {
  const palette = $('#palette'); palette.replaceChildren();
  for (const color of editor.getPalette()) { const button = document.createElement('button'); button.type='button'; button.className='palette-swatch'; button.style.background=color; button.setAttribute('aria-label',`Farbe ${color}`); button.addEventListener('click',()=>{editor.setColor(color);$('#color-picker').value=color;$('#color-swatch').style.background=color;}); palette.append(button); }
}
function paintThumbnail(canvas, pixels) { const ctx=canvas.getContext('2d'); const image=ctx.createImageData(16,16); pixels.forEach((color,index)=>{if(!color)return;const n=parseInt(color.slice(1),16),at=index*4;image.data[at]=(n>>16)&255;image.data[at+1]=(n>>8)&255;image.data[at+2]=n&255;image.data[at+3]=255;});ctx.putImageData(image,0,0); }

function scheduleSave() { setSaveStatus('Änderungen …'); $('#download-jar-button').hidden=true; clearTimeout(dirtyTimer); dirtyTimer=setTimeout(saveNow,500); }
async function saveNow() {
  if (!project) return;
  clearTimeout(dirtyTimer);
  try { const saved=await api(`/api/projects/${project.id}`,{method:'PUT',body:jsonBody(project)}); project=saved.project; setSaveStatus('Gespeichert'); await refreshProjects(); }
  catch(error){setSaveStatus('Speichern fehlgeschlagen');toast(error.message);}
}
function setSaveStatus(value){$('#save-status').lastChild.textContent=value;}

async function refreshCapabilityLabel(){try{const info=await api('/api/capabilities');$('#target-status').textContent=info.runtime.ready?'TOOLCHAIN BEREIT':'TOOLCHAIN FEHLT';$('#target-status').classList.toggle('ready',info.runtime.ready);const loader=$('#loader-select');loader.replaceChildren(...info.loaders.map((item)=>{const option=document.createElement('option');option.value=item.id;option.textContent=item.label+(item.status==='supported'?'':' · geplant');option.disabled=item.status!=='supported';return option;}));const version=$('#version-select');version.replaceChildren(...(info.loaders.find((item)=>item.id==='fabric')?.versions||[]).map((value)=>{const option=document.createElement('option');option.value=value;option.textContent=value;return option;}));}catch{}}
async function changeTarget(){if(!project)return;project.target.loader=$('#loader-select').value;project.target.minecraftVersion=$('#version-select').value;await saveNow();}
function showView(view){currentView=view;document.querySelectorAll('.mode-tab').forEach((button)=>{button.classList.toggle('active',button.dataset.view===view);button.setAttribute('aria-selected',String(button.dataset.view===view));});$('#design-view').hidden=view!=='design';$('#code-view').hidden=view!=='code';$('#build-view').hidden=view!=='build';if(view==='code')refreshSource();if(view==='build')refreshBuildStatus();}

async function refreshSource(){if(!project)return;try{const result=await api(`/api/projects/${project.id}/files`);$('#file-list').replaceChildren();const pre=$('#code-output');for(const file of result.files){const button=document.createElement('button');button.className='file-button';button.textContent=file.path;button.addEventListener('click',()=>showSourceFile(file));$('#file-list').append(button);}if(result.files.length){const source=result.files.find((file)=>file.path.endsWith('ModEntry.java'))||result.files[0];showSourceFile(source);}}catch(error){toast(error.message);}}
function showSourceFile(file){const pre=$('#code-output');currentSourcePath=file.path;$('#open-file-label').textContent=file.path;const editable=file.path.endsWith('.java');pre.readOnly=!editable;pre.placeholder=editable?'Java-Quellcode wird hier gespeichert.':'Diese Datei wird vom Projektmodell erzeugt.';pre.value=editable?(project.sourceOverrides?.[file.path]??file.content??''):(file.content||'[Binärdatei: Textur]');}
async function exportProject(){if(!project)return;try{const response=await fetch(`/api/projects/${project.id}/source`);if(!response.ok)throw new Error('Das Quellprojekt konnte nicht exportiert werden.');const blob=await response.blob();const url=URL.createObjectURL(blob);const a=document.createElement('a');a.href=url;a.download=`${project.namespace}-source.zip`;a.click();URL.revokeObjectURL(url);toast('Quellprojekt exportiert.');}catch(error){toast(error.message);}}
async function refreshBuildStatus(){if(!project)return;try{const status=await api(`/api/projects/${project.id}/build`);$('#build-requirements').textContent=status.message;$('#build-button').disabled=!status.ready;const download=$('#download-jar-button');download.hidden=!status.artifactAvailable;if(status.artifactAvailable){download.href=`/api/projects/${project.id}/artifact`;download.download=status.artifactName;}}catch(error){$('#build-requirements').textContent=error.message;}}
async function startBuild(){await refreshBuildStatus();if($('#build-button').disabled){toast('Dieses Ziel ist noch nicht als vollständig baubar freigeschaltet.');return;}const button=$('#build-button'),log=$('#build-log'),download=$('#download-jar-button');button.disabled=true;download.hidden=true;log.replaceChildren();log.textContent='Build startet …\n';try{const response=await fetch(`/api/projects/${project.id}/build`,{method:'POST'});if(!response.ok){const error=await response.json().catch(()=>({}));throw new Error(error.error||'Build fehlgeschlagen.');}const reader=response.body.getReader();const decoder=new TextDecoder();let buffer='';while(true){const {value,done}=await reader.read();if(done)break;buffer+=decoder.decode(value,{stream:true});const events=buffer.split('\n\n');buffer=events.pop()||'';for(const raw of events){const event=raw.match(/^event: (.+)$/m)?.[1];const data=raw.split('\n').find(line=>line.startsWith('data: '))?.slice(6);if(!event||!data)continue;const payload=JSON.parse(data);if(event==='log'){log.append(document.createTextNode(payload.text));log.scrollTop=log.scrollHeight;}if(event==='complete'){log.append(document.createTextNode(payload.ok?'\nBUILD ERFOLGREICH':'\nBUILD FEHLGESCHLAGEN'));if(payload.ok&&payload.artifact){download.href=`/api/projects/${project.id}/artifact`;download.download=payload.filename;download.hidden=false;}toast(payload.ok?'Mod erfolgreich gebaut.':'Der Build ist fehlgeschlagen. Sieh dir die Ausgabe an.');}}}}catch(error){log.append(document.createTextNode(`\n${error.message}`));toast(error.message);}finally{button.disabled=false;await refreshBuildStatus();}}

async function connectChatGPT(){try{const result=await api('/api/auth/start',{method:'POST',body:'{}'});if(result.authorizationUrl){$('#assistant-state').textContent='Anmeldung im Browser';await window.modStudio?.openExternal(result.authorizationUrl);}}catch(error){toast(error.message);}}
async function refreshAuthStatus(){try{const [status,providers]=await Promise.all([api('/api/auth/status'),api('/api/ai/providers')]);chatConnected=Boolean(status.connected);localModels=providers.ollama?.models||[];$('#account-label').textContent=status.label;$('#account-detail').textContent=localModels.length?`${localModels.length} lokale Ollama-Modelle verfügbar`:status.detail;const provider=$('#ai-provider-select');provider.querySelector('[value="chatgpt"]').disabled=!chatConnected;provider.querySelector('[value="ollama"]').disabled=!localModels.length;if(!provider.value||(!chatConnected&&!localModels.length)){provider.value='chatgpt';}else if(provider.value==='chatgpt'&&!chatConnected&&localModels.length){provider.value='ollama';}await refreshAiModelChoices();}catch{}}
async function refreshAiModelChoices(){const provider=$('#ai-provider-select').value;const modelSelect=$('#ai-model-select');let models=[];if(provider==='ollama')models=localModels;else if(chatConnected){try{const result=await api('/api/auth/models');chatModels=result.models||[];selectedChatModel=result.selectedModel||null;models=chatModels;}catch{models=chatModels;}}modelSelect.replaceChildren(...models.map((model)=>{const option=document.createElement('option');option.value=model.name||model.id;const size=model.size?` · ${(model.size/1_000_000_000).toFixed(1)} GB`:'';option.textContent=`${model.name||model.id}${size}`;return option;}));if(provider==='chatgpt'&&selectedChatModel)modelSelect.value=selectedChatModel;modelSelect.disabled=!models.length;const ready=provider==='ollama'?localModels.length>0:chatConnected;$('#assistant-state').textContent=ready?(provider==='ollama'?`Ollama lokal · ${modelSelect.value||'Modell bereit'}`:'ChatGPT verbunden'):'lokale Vorschau';$('#assistant-dot').style.background=ready?'#c6ff4a':'#747b7d';$('#auth-nudge').hidden=ready;$('#chat-input').disabled=!ready;$('#send-chat-button').disabled=!ready;}
async function sendMessage(){const input=$('#chat-input');const content=input.value.trim();if(!project||!content)return;const provider=$('#ai-provider-select').value;const model=$('#ai-model-select').value;if(provider==='chatgpt'&&!chatConnected||provider==='ollama'&&!localModels.length){toast('Wähle einen verfügbaren KI-Anbieter aus.');return;}input.value='';$('#send-chat-button').disabled=true;addChatMessage('user',content);project.conversation.push({role:'user',content,createdAt:new Date().toISOString()});await saveNow();const pending=addChatMessage('assistant',provider==='ollama'?'Lokales Modell arbeitet …':'Mod-Vorschlag wird erstellt …');pending.classList.add('streaming');try{const response=await fetch(`/api/projects/${project.id}/ai`,{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({message:content,provider,model})});if(!response.ok){const error=await response.json().catch(()=>({}));throw new Error(error.error||'KI-Anfrage fehlgeschlagen.');}const reader=response.body.getReader();const decoder=new TextDecoder();let buffer='';let candidate=null;while(true){const {value,done}=await reader.read();if(done)break;buffer+=decoder.decode(value,{stream:true});const events=buffer.split('\n\n');buffer=events.pop()||'';for(const raw of events){const eventName=raw.match(/^event: (.+)$/m)?.[1];const data=raw.split('\n').find(line=>line.startsWith('data: '))?.slice(6);if(!data)continue;const payload=JSON.parse(data);if(eventName==='candidate')candidate=payload;if(eventName==='error')throw new Error(payload.message||'KI-Anfrage fehlgeschlagen.');}}pending.classList.remove('streaming');if(candidate){pending.querySelector('p').textContent=candidate.message;showCandidate(pending,candidate.project);}else throw new Error('Die Antwort wurde vor dem Abschluss unterbrochen.');}catch(error){pending.classList.remove('streaming');pending.querySelector('p').textContent=error.message;toast(error.message);}finally{$('#send-chat-button').disabled=!$('#chat-input').disabled;}}
function showCandidate(messageNode,candidate){const details=document.createElement('div');details.className='candidate-actions';const summary=document.createElement('span');summary.textContent=`Vorschlag: ${candidate.elements.length} Mod-Elemente`;const apply=document.createElement('button');apply.type='button';apply.className='candidate-apply';apply.textContent='Übernehmen';const discard=document.createElement('button');discard.type='button';discard.className='candidate-discard';discard.textContent='Verwerfen';apply.addEventListener('click',async()=>{try{const saved=await api(`/api/projects/${project.id}/ai`,{method:'PUT',body:JSON.stringify({project:candidate})});project=saved.project;editor?.destroy();renderElements();editor=createPixelEditor($('#pixel-canvas'),selectedElement()?.texture||{size:16,pixels:Array(256).fill(null)},onTextureChange);renderPalette();updateSelection();renderChat();await saveNow();toast('KI-Vorschlag übernommen.');}catch(error){toast(error.message);}});discard.addEventListener('click',()=>{details.replaceChildren(summary,document.createTextNode(' · Vorschlag verworfen'));});details.append(summary,apply,discard);messageNode.append(details);}
function addChatMessage(role,content){const list=$('#chat-messages');const node=document.createElement('div');node.className=`chat-message ${role}`;const label=role==='user'?'DU':'MOD-ASSISTENT';node.innerHTML=`<span class="message-role">${label}</span><p></p>`;node.querySelector('p').textContent=content;list.append(node);list.scrollTop=list.scrollHeight;return node;}
function renderChat(){const list=$('#chat-messages');list.querySelectorAll('.chat-message').forEach((item)=>item.remove());for(const message of project.conversation||[])addChatMessage(message.role,message.content);}
function toast(message){const region=$('#toast-region');const item=document.createElement('div');item.className='toast';item.textContent=message;region.append(item);setTimeout(()=>item.remove(),3800);}
function escapeHtml(text){const div=document.createElement('div');div.textContent=text;return div.innerHTML;}

initialize().catch((error)=>toast(error.message));
