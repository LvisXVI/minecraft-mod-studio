const SIZE = 16;

export function createPixelEditor(canvas, initialTexture, onChange) {
  const context = canvas.getContext('2d', { alpha: false });
  let pixels = [...initialTexture.pixels];
  let color = '#465E84';
  let tool = 'pencil';
  let isDrawing = false;
  let undoStack = [];
  let redoStack = [];
  let onCommit = onChange;
  const colors = ['#465E84', '#29354A', '#79899E', '#C6A875', '#E7D9B7', '#F4F2EC', '#B8674D', '#71936B', '#D8B858', '#94B8BE', '#B579AD', '#4D7655'];

  function draw() {
    const width = canvas.width;
    const height = canvas.height;
    const cell = width / SIZE;
    context.fillStyle = '#f0f1f3';
    context.fillRect(0, 0, width, canvas.height);
    for (let y = 0; y < SIZE; y += 1) {
      for (let x = 0; x < SIZE; x += 1) {
        context.fillStyle = (x + y) % 2 === 0 ? '#f3f4f6' : '#e8eaed';
        context.fillRect(x * cell, y * cell, cell, cell);
        const pixel = pixels[y * SIZE + x];
        if (pixel) {
          context.fillStyle = pixel;
          context.fillRect(x * cell + 1, y * cell + 1, cell - 2, cell - 2);
        }
      }
    }
    context.strokeStyle = 'rgba(26, 38, 53, .12)';
    context.lineWidth = 1;
    for (let index = 0; index <= SIZE; index += 1) {
      const pos = Math.round(index * cell) + 0.5;
      context.beginPath(); context.moveTo(pos, 0); context.lineTo(pos, height); context.stroke();
      context.beginPath(); context.moveTo(0, pos); context.lineTo(width, pos); context.stroke();
    }
  }

  function coordinate(event) {
    const bounds = canvas.getBoundingClientRect();
    return {
      x: Math.max(0, Math.min(SIZE - 1, Math.floor(((event.clientX - bounds.left) / bounds.width) * SIZE))),
      y: Math.max(0, Math.min(SIZE - 1, Math.floor(((event.clientY - bounds.top) / bounds.height) * SIZE))),
    };
  }

  function commit() {
    draw();
    onCommit({ size: SIZE, pixels: [...pixels] });
  }

  function snapshot() {
    undoStack.push([...pixels]);
    if (undoStack.length > 50) undoStack.shift();
    redoStack = [];
  }

  function setPixel(x, y) {
    const index = y * SIZE + x;
    const next = tool === 'eraser' ? null : color;
    if (pixels[index] === next) return;
    pixels[index] = next;
    draw();
  }

  function fillAt(startX, startY) {
    const startIndex = startY * SIZE + startX;
    const original = pixels[startIndex];
    if (original === color) return;
    snapshot();
    const stack = [[startX, startY]];
    while (stack.length) {
      const [x, y] = stack.pop();
      if (x < 0 || x >= SIZE || y < 0 || y >= SIZE) continue;
      const index = y * SIZE + x;
      if (pixels[index] !== original) continue;
      pixels[index] = color;
      stack.push([x + 1, y], [x - 1, y], [x, y + 1], [x, y - 1]);
    }
    commit();
  }

  function pointerDown(event) {
    event.preventDefault();
    const { x, y } = coordinate(event);
    if (tool === 'fill') return fillAt(x, y);
    snapshot();
    isDrawing = true;
    canvas.setPointerCapture(event.pointerId);
    setPixel(x, y);
  }

  function pointerMove(event) {
    if (!isDrawing) return;
    const { x, y } = coordinate(event);
    setPixel(x, y);
  }

  function pointerUp() {
    if (!isDrawing) return;
    isDrawing = false;
    commit();
  }

  canvas.addEventListener('pointerdown', pointerDown);
  canvas.addEventListener('pointermove', pointerMove);
  canvas.addEventListener('pointerup', pointerUp);
  canvas.addEventListener('pointercancel', pointerUp);
  draw();

  return {
    setTool(value) { tool = ['pencil', 'eraser', 'fill'].includes(value) ? value : 'pencil'; },
    setColor(value) { if (/^#[\da-f]{6}$/i.test(value)) color = value.toUpperCase(); },
    setTexture(texture) { pixels = [...texture.pixels]; undoStack = []; redoStack = []; draw(); },
    setChangeHandler(callback) { onCommit = callback; },
    getTexture() { return { size: SIZE, pixels: [...pixels] }; },
    undo() { if (!undoStack.length) return; redoStack.push([...pixels]); pixels = undoStack.pop(); commit(); },
    redo() { if (!redoStack.length) return; undoStack.push([...pixels]); pixels = redoStack.pop(); commit(); },
    clear() { if (pixels.every((pixel) => pixel === null)) return; snapshot(); pixels.fill(null); commit(); },
    getPalette() { return [...colors]; },
    destroy() {
      canvas.removeEventListener('pointerdown', pointerDown);
      canvas.removeEventListener('pointermove', pointerMove);
      canvas.removeEventListener('pointerup', pointerUp);
      canvas.removeEventListener('pointercancel', pointerUp);
    },
  };
}

export function renderVoxelPreview(canvas, pixels, element, rotation = 0) {
  const context = canvas.getContext('2d');
  const width = canvas.width;
  const height = canvas.height;
  const texture = pixels?.length === SIZE * SIZE ? pixels : Array(SIZE * SIZE).fill(null);
  context.clearRect(0, 0, width, height);
  const centerX = width / 2;
  const centerY = height * 0.54;
  const scale = width * 0.4;
  const angle = rotation * Math.PI / 2;
  const point = (x, y, z) => {
    const rx = x * Math.cos(angle) - z * Math.sin(angle);
    const rz = x * Math.sin(angle) + z * Math.cos(angle);
    return [centerX + (rx - rz) * scale * 0.5, centerY + (rx + rz) * scale * 0.25 - y * scale * 0.58];
  };
  const path = (vertices, color) => {
    context.beginPath();
    vertices.map(([x, y, z]) => point(x, y, z)).forEach(([x, y], index) => index ? context.lineTo(x, y) : context.moveTo(x, y));
    context.closePath();
    context.fillStyle = color;
    context.fill();
    context.strokeStyle = 'rgba(30,43,59,.12)';
    context.lineWidth = 1;
    context.stroke();
  };
  const size = 1;
  path([[0, 0, 1], [1, 0, 1], [1, 1, 1], [0, 1, 1]], '#6F87A4');
  path([[1, 0, 0], [1, 0, 1], [1, 1, 1], [1, 1, 0]], '#536B89');
  path([[0, 1, 0], [1, 1, 0], [1, 1, 1], [0, 1, 1]], '#8FA0B4');

  if (element?.kind === 'block') {
    drawTexturePlane(texture, (u, v) => point(u, 1 - v, 1.002), context, size);
    drawTexturePlane(texture, (u, v) => point(1.002, 1 - v, 1 - u), context, size);
    drawTexturePlane(texture, (u, v) => point(u, 1 - v, 0.002), context, size);
  } else {
    context.save();
    const [x, y] = point(0.5, 1.06, 0.5);
    context.translate(x, y);
    context.rotate(-Math.PI / 4);
    context.transform(1, 0.5, 0, 1, 0, 0);
    const tile = scale * 0.39;
    const cell = tile / SIZE;
    for (let py = 0; py < SIZE; py += 1) {
      for (let px = 0; px < SIZE; px += 1) {
        const pixel = texture[py * SIZE + px];
        if (!pixel) continue;
        context.fillStyle = pixel;
        context.fillRect((px - SIZE / 2) * cell, (py - SIZE / 2) * cell, cell + 0.5, cell + 0.5);
      }
    }
    context.restore();
  }

  function drawTexturePlane(texturePixels, map, ctx, extent) {
    const n = SIZE;
    const image = ctx.createImageData(n, n);
    for (let y = 0; y < n; y += 1) for (let x = 0; x < n; x += 1) {
      const color = parseHex(texturePixels[y * n + x] || '#ffffff');
      const index = (y * n + x) * 4;
      image.data[index] = color[0]; image.data[index + 1] = color[1]; image.data[index + 2] = color[2]; image.data[index + 3] = texturePixels[y * n + x] ? 255 : 0;
    }
    const scratch = document.createElement('canvas');
    scratch.width = n; scratch.height = n;
    scratch.getContext('2d').putImageData(image, 0, 0);
    const [a, b] = map(0, 0), [c, d] = map(extent, 0), [e, f] = map(0, extent);
    ctx.save();
    ctx.setTransform((c - a) / n, (d - b) / n, (e - a) / n, (f - b) / n, a, b);
    ctx.imageSmoothingEnabled = false;
    ctx.drawImage(scratch, 0, 0);
    ctx.restore();
  }

  function parseHex(value) { const n = Number.parseInt(value.slice(1), 16); return [(n >> 16) & 255, (n >> 8) & 255, n & 255]; }
}
