// A small colour picker for the pixel editor: saturation/brightness square, hue slider, hex field and recent colours.
// It replaces the plain system colour dialog so painting stays inside the app.
const clamp = (value, min, max) => Math.min(max, Math.max(min, value));

export function hexToHsv(hex) {
  const n = Number.parseInt(hex.slice(1, 7), 16);
  const r = ((n >> 16) & 255) / 255, g = ((n >> 8) & 255) / 255, b = (n & 255) / 255;
  const max = Math.max(r, g, b), min = Math.min(r, g, b), d = max - min;
  let h = 0;
  if (d) h = max === r ? ((g - b) / d) % 6 : max === g ? (b - r) / d + 2 : (r - g) / d + 4;
  return { h: (h * 60 + 360) % 360, s: max ? d / max : 0, v: max };
}

export function hsvToHex({ h, s, v }) {
  const c = v * s, x = c * (1 - Math.abs(((h / 60) % 2) - 1)), m = v - c;
  const [r, g, b] = h < 60 ? [c, x, 0] : h < 120 ? [x, c, 0] : h < 180 ? [0, c, x] : h < 240 ? [0, x, c] : h < 300 ? [x, 0, c] : [c, 0, x];
  return `#${[r, g, b].map((value) => Math.round((value + m) * 255).toString(16).padStart(2, '0')).join('')}`.toUpperCase();
}

export function createColorPicker({ button, initial = '#465E84', onChange }) {
  let hsv = hexToHsv(initial), recent = [];
  const panel = document.createElement('div');
  panel.className = 'cp-panel'; panel.hidden = true; panel.setAttribute('role', 'dialog'); panel.setAttribute('aria-label', 'Farbe wählen');
  panel.innerHTML = `<canvas class="cp-square" width="220" height="150" aria-label="Sättigung und Helligkeit"></canvas>
    <input class="cp-hue" type="range" min="0" max="359" step="1" aria-label="Farbton">
    <div class="cp-row"><span class="cp-preview" aria-hidden="true"></span><label>HEX<input class="cp-hex" maxlength="7" spellcheck="false" autocomplete="off" aria-label="Hex-Farbwert"></label></div>
    <div class="cp-recent" aria-label="Zuletzt benutzt"></div>`;
  button.insertAdjacentElement('afterend', panel);
  const square = panel.querySelector('.cp-square'), hue = panel.querySelector('.cp-hue'), hex = panel.querySelector('.cp-hex'), preview = panel.querySelector('.cp-preview'), recentBox = panel.querySelector('.cp-recent');
  const ctx = square.getContext('2d');

  function drawSquare() {
    ctx.fillStyle = `hsl(${hsv.h}, 100%, 50%)`; ctx.fillRect(0, 0, square.width, square.height);
    const white = ctx.createLinearGradient(0, 0, square.width, 0); white.addColorStop(0, '#fff'); white.addColorStop(1, 'rgba(255,255,255,0)');
    ctx.fillStyle = white; ctx.fillRect(0, 0, square.width, square.height);
    const black = ctx.createLinearGradient(0, 0, 0, square.height); black.addColorStop(0, 'rgba(0,0,0,0)'); black.addColorStop(1, '#000');
    ctx.fillStyle = black; ctx.fillRect(0, 0, square.width, square.height);
    const x = hsv.s * square.width, y = (1 - hsv.v) * square.height;
    ctx.beginPath(); ctx.arc(x, y, 6, 0, Math.PI * 2); ctx.lineWidth = 2; ctx.strokeStyle = '#fff'; ctx.stroke();
    ctx.beginPath(); ctx.arc(x, y, 7.5, 0, Math.PI * 2); ctx.lineWidth = 1; ctx.strokeStyle = 'rgba(0,0,0,.6)'; ctx.stroke();
  }

  function sync(emit = true, fromHex = false) {
    const value = hsvToHex(hsv);
    drawSquare(); hue.value = String(Math.round(hsv.h)); preview.style.background = value; button.style.background = value;
    if (!fromHex) hex.value = value;
    if (emit) onChange?.(value);
  }

  function pickAt(event) {
    const bounds = square.getBoundingClientRect();
    hsv.s = clamp((event.clientX - bounds.left) / bounds.width, 0, 1); hsv.v = 1 - clamp((event.clientY - bounds.top) / bounds.height, 0, 1);
    sync();
  }
  let dragging = false;
  square.addEventListener('pointerdown', (event) => { dragging = true; square.setPointerCapture(event.pointerId); pickAt(event); });
  square.addEventListener('pointermove', (event) => { if (dragging) pickAt(event); });
  square.addEventListener('pointerup', () => { dragging = false; remember(hsvToHex(hsv)); });
  hue.addEventListener('input', () => { hsv.h = Number(hue.value); sync(); });
  hue.addEventListener('change', () => remember(hsvToHex(hsv)));
  hex.addEventListener('input', () => {
    let value = hex.value.trim(); if (value && !value.startsWith('#')) value = `#${value}`;
    if (/^#[\da-f]{6}$/i.test(value)) { hsv = hexToHsv(value); sync(true, true); remember(value.toUpperCase()); }
  });

  function remember(color) {
    recent = [color, ...recent.filter((item) => item !== color)].slice(0, 10);
    recentBox.replaceChildren(...recent.map((item) => {
      const swatch = document.createElement('button');
      swatch.type = 'button'; swatch.className = 'cp-swatch'; swatch.style.background = item; swatch.setAttribute('aria-label', `Farbe ${item}`);
      swatch.addEventListener('click', () => { hsv = hexToHsv(item); sync(); });
      return swatch;
    }));
  }

  function open() { panel.hidden = false; button.setAttribute('aria-expanded', 'true'); hex.value = hsvToHex(hsv); drawSquare(); }
  function close() { panel.hidden = true; button.setAttribute('aria-expanded', 'false'); }
  button.setAttribute('aria-haspopup', 'dialog'); button.setAttribute('aria-expanded', 'false');
  button.addEventListener('click', (event) => { event.stopPropagation(); if (panel.hidden) open(); else close(); });
  document.addEventListener('pointerdown', (event) => { if (!panel.hidden && !panel.contains(event.target) && event.target !== button && !button.contains(event.target)) close(); });
  panel.addEventListener('keydown', (event) => { if (event.key === 'Escape') { event.stopPropagation(); close(); button.focus(); } });
  sync(false);

  return {
    set(color) { if (/^#[\da-f]{6}$/i.test(color)) { hsv = hexToHsv(color); sync(false); remember(color.toUpperCase()); } },
    get: () => hsvToHex(hsv),
    close,
  };
}
