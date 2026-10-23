import test from 'node:test';
import assert from 'node:assert/strict';
import { preserveBlockbenchModels, validateJavaBlockModel } from '../server/blockbench.js';
import { createBlockbenchProject, importBlockbenchProject } from '../public/blockbench.js';
import { makeElement, makeProject, validateProject } from '../server/schema.js';
import { createGenerator } from '../server/generator.js';

const validModel = {
  parent: 'minecraft:block/block',
  textures: { all: 'minecraft:block/stone' },
  elements: [{
    from: [0, 0, 0], to: [16, 12, 16],
    faces: { north: { uv: [0, 0, 16, 12], texture: '#all' }, south: { uv: [0, 0, 16, 12], texture: '#all' } },
  }],
};

test('accepts editable Blockbench Java block models and keeps face data', () => {
  const model = validateJavaBlockModel(validModel);
  assert.equal(model.elements[0].to[1], 12);
  assert.deepEqual(model.elements[0].faces.north.uv, [0, 0, 16, 12]);
  assert.equal(model.elements[0].faces.north.texture, '#all');
});

test('exports a real Blockbench 5 Java project with embedded texture and the selected geometry', () => {
  const element = makeElement('block');
  element.name = 'Leuchtstein';
  element.identifier = 'glow_stone';
  element.javaModel = validModel;
  const texture = 'data:image/png;base64,AA==';
  const model = createBlockbenchProject(element, texture, () => '12345678-1234-4234-8234-123456789abc');

  assert.deepEqual(model.meta, { format_version: '5.0', model_format: 'java_block', box_uv: false });
  assert.equal(model.name, 'glow_stone');
  assert.equal(model.elements[0].to[1], 12);
  assert.equal(model.elements[0].faces.north.texture, 0);
  assert.equal(model.textures[0].source, texture);
  assert.equal(model.outliner[0], model.elements[0].uuid);
});

test('imports a Blockbench Java project back into the Minecraft model format', () => {
  const element = makeElement('block');
  element.identifier = 'glow_stone';
  element.javaModel = validModel;
  const source = createBlockbenchProject(element, 'data:image/png;base64,AA==', () => '12345678-1234-4234-8234-123456789abc');
  const imported = importBlockbenchProject(source);
  const safeModel = validateJavaBlockModel(imported.javaModel);
  assert.deepEqual(safeModel.elements[0].from, [0, 0, 0]);
  assert.deepEqual(safeModel.elements[0].to, [16, 12, 16]);
  assert.equal(safeModel.elements[0].faces.north.texture, '#all');
  assert.equal(safeModel.textures.all, 'blockbench:source');
  assert.equal(imported.textureSource, 'data:image/png;base64,AA==');
});

test('rejects unsafe, oversized, or invalid Blockbench model geometry', () => {
  assert.throws(() => validateJavaBlockModel({ ...validModel, elements: Array(129).fill(validModel.elements[0]) }), /128/);
  assert.throws(() => validateJavaBlockModel({ ...validModel, elements: [{ from: [0, 0, 0], to: [16, 16, 16], faces: { north: { texture: '#missing', uv: [0, 0, 16, 16] } } }] }), /Textur/);
  assert.throws(() => validateJavaBlockModel(JSON.parse('{"__proto__":{"polluted":true},"elements":[]}')), /ungültig|nicht unterstützt/i);
});

test('keeps a Blockbench model attached when an AI candidate omits that optional project field', () => {
  const current = { elements: [{ id: 'element-a', javaModel: validModel }] };
  const candidate = { elements: [{ id: 'element-a', name: 'Neue Beschreibung' }, { id: 'element-b', name: 'Neues Item' }] };
  preserveBlockbenchModels(candidate, current);
  assert.deepEqual(candidate.elements[0].javaModel, validModel);
  assert.equal(candidate.elements[1].javaModel, undefined);
});

test('persists imported Blockbench geometry and emits its real model JSON into the mod source', () => {
  const project = makeProject({ name: 'Blockbench Brücke', target: { loader: 'fabric', minecraftVersion: '26.2' } });
  const element = makeElement('block');
  element.name = 'Geschnitzter Stein';
  element.identifier = 'carved_stone';
  element.javaModel = validModel;
  project.elements.push(element);
  project.activeElementId = element.id;

  const savedProject = validateProject(project);
  const files = createGenerator({ dataDir: 'unused', runtimeDir: {} }).generate(savedProject);
  const modelFile = files.find((file) => file.path.endsWith('/models/block/carved_stone.json'));
  const generatedModel = JSON.parse(modelFile.content);
  assert.deepEqual(generatedModel.elements[0].to, [16, 12, 16]);
  assert.equal(generatedModel.textures.all, `${savedProject.namespace}:block/carved_stone`);
  assert.equal(generatedModel.elements[0].faces.north.texture, '#all');
});

