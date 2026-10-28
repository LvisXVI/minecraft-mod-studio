import test from 'node:test';
import assert from 'node:assert/strict';
import { makeProject, makeElement, validateProject } from '../server/schema.js';
import { createBlockbenchProject, importBlockbenchProject } from '../public/blockbench.js';

const make = (size) => ({ id: crypto.randomUUID(), kind: 'item', name: 'Test', identifier: 'test_item', description: '', properties: { maxStackSize: 64 }, texture: { size, pixels: Array(size * size).fill(null) }, recipes: [] });

test('textures can be 16, 32, 64 or 128 pixels square', () => {
  for (const size of [16, 32, 64, 128]) {
    const project = makeProject({ name: 'Sizes' });
    project.elements.push(make(size)); project.activeElementId = project.elements[0].id;
    const checked = validateProject(project);
    assert.equal(checked.elements[0].texture.size, size);
    assert.equal(checked.elements[0].texture.pixels.length, size * size);
  }
});

test('other texture sizes are rejected', () => {
  const project = makeProject({ name: 'Sizes' });
  project.elements.push({ ...make(16), texture: { size: 24, pixels: Array(24 * 24).fill(null) } });
  assert.throws(() => validateProject(project), /16×16, 32×32, 64×64 oder 128×128/);
});

test('Blockbench projects use the texture size and UVs round-trip', () => {
  for (const size of [16, 32, 64]) {
    const element = { ...make(size), javaModel: { elements: [{ from: [0, 0, 0], to: [16, 16, 16], faces: { north: { uv: [0, 0, 8, 8], texture: '#all' } } }] } };
    const bb = createBlockbenchProject(element, 'data:image/png;base64,AAAA');
    assert.deepEqual(bb.resolution, { width: size, height: size });
    assert.deepEqual(bb.elements[0].faces.north.uv, [0, 0, 8 * size / 16, 8 * size / 16]);
    const back = importBlockbenchProject(bb);
    assert.equal(back.textureSize, size);
    assert.deepEqual(back.javaModel.elements[0].faces.north.uv, [0, 0, 8, 8]);
  }
});

test('non-square or odd Blockbench resolutions are refused with a clear message', () => {
  const element = make(16);
  const bb = createBlockbenchProject(element, 'data:image/png;base64,AAAA');
  assert.throws(() => importBlockbenchProject({ ...bb, resolution: { width: 24, height: 24 } }), /16, 32, 64 oder 128/);
});
