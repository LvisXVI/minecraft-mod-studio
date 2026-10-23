import test from 'node:test';
import assert from 'node:assert/strict';
import { createPixelEditor, renderVoxelPreview } from '../public/editor.js';

test('pixel editor draws within the canvas bounds and commits a painted pixel', () => {
  const handlers = new Map();
  const lineEnds = [];
  const context = {
    fillRect() {}, beginPath() {}, moveTo() {}, stroke() {},
    lineTo(x, y) { lineEnds.push([x, y]); },
  };
  const canvas = {
    width: 320, height: 320,
    getContext: () => context,
    addEventListener: (name, handler) => handlers.set(name, handler),
    removeEventListener() {},
    setPointerCapture() {},
    getBoundingClientRect: () => ({ left: 0, top: 0, width: 320, height: 320 }),
  };
  let committed;

  const editor = createPixelEditor(canvas, { size: 16, pixels: Array(256).fill(null) }, (texture) => { committed = texture; });
  assert.ok(lineEnds.some(([x, y]) => x === 0.5 && y === 320), 'grid lines extend to the canvas height');
  handlers.get('pointerdown')({ preventDefault() {}, clientX: 160, clientY: 160, pointerId: 1 });
  handlers.get('pointerup')();

  assert.equal(committed.size, 16);
  assert.equal(committed.pixels[136], '#465E84');
  assert.equal(committed.pixels.filter(Boolean).length, 1);
  editor.destroy();
});

test('empty voxel preview stays empty until a mod element exists', () => {
  const calls = [];
  const context = { clearRect: (...args) => calls.push(['clearRect', ...args]) };
  renderVoxelPreview({ width: 360, height: 360, getContext: () => context }, Array(256).fill(null), null);
  assert.deepEqual(calls, [['clearRect', 0, 0, 360, 360]]);
});

test('item preview renders its transparent texture as a floating sprite without a block cube', () => {
  const calls = [];
  const mainContext = {
    clearRect() {}, save() {}, translate() {}, rotate() {}, transform() {}, restore() {},
    drawImage: (...args) => calls.push(['drawImage', ...args]),
  };
  const textureContext = {
    createImageData(size) { return { data: new Uint8ClampedArray(size * size * 4) }; },
    putImageData(image) { calls.push(['putImageData', image.data.length]); },
  };
  const previousDocument = globalThis.document;
  globalThis.document = { createElement: () => ({ width: 0, height: 0, getContext: () => textureContext }) };
  try {
    renderVoxelPreview({ width: 360, height: 360, getContext: () => mainContext }, Array(256).fill('#B8FF32'), { kind: 'item' });
  } finally {
    if (previousDocument === undefined) delete globalThis.document;
    else globalThis.document = previousDocument;
  }

  assert.equal(calls.filter(([name]) => name === 'drawImage').length, 1);
  assert.equal(calls.some(([name]) => name === 'beginPath'), false);
});
