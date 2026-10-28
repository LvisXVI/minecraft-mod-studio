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

test('brush size, rotation and flipping change the texture as expected', async () => {
  const { createPixelEditor } = await import('../public/editor.js');
  const canvas = { width: 320, height: 320, getContext: () => new Proxy({}, { get: () => () => {}, set: () => true }), addEventListener() {}, removeEventListener() {}, getBoundingClientRect: () => ({ left: 0, top: 0, width: 320, height: 320 }), setPointerCapture() {} };
  let latest = null;
  const editor = createPixelEditor(canvas, { size: 16, pixels: Array(256).fill(null) }, (texture) => { latest = texture; });
  const first = Array(256).fill(null); first[0] = '#FF0000';
  editor.setTexture({ size: 16, pixels: first });
  editor.rotate('cw');
  assert.equal(latest.pixels[15], '#FF0000', 'top-left pixel moves to top-right after a clockwise turn');
  editor.rotate('ccw');
  assert.equal(latest.pixels[0], '#FF0000', 'a counter-clockwise turn undoes it');
  editor.flip('h');
  assert.equal(latest.pixels[15], '#FF0000', 'horizontal flip mirrors left to right');
  editor.flip('v');
  assert.equal(latest.pixels[255], '#FF0000', 'vertical flip mirrors top to bottom');
  editor.setBrush(3);
  assert.equal(editor.getBrush(), 3);
  editor.setBrush(99);
  assert.equal(editor.getBrush(), 8, 'brush size is capped');
  const size32 = Array(1024).fill(null); size32[1] = '#00FF00';
  editor.setTexture({ size: 32, pixels: size32 });
  editor.rotate('cw');
  assert.equal(latest.pixels[31 + 32], '#00FF00', 'rotation works for 32 px textures too');
});
