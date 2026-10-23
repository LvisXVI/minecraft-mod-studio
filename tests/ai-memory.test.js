import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtemp, rm } from 'node:fs/promises';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
import { createAiMemory, extractRule, validateLearnedRule } from '../server/ai-memory.js';
import { shouldSearchMinecraftDocs } from '../server/ai.js';

test('explicit learning phrases become concise reusable preferences', () => {
  assert.equal(extractRule('Merk dir bitte: Erkläre neue Fachbegriffe kurz und verständlich.'), 'Erkläre neue Fachbegriffe kurz und verständlich');
  assert.equal(extractRule('Ab jetzt nutze ich Fabric für dieses Projekt'), 'nutze ich Fabric für dieses Projekt');
  assert.equal(extractRule('Erstelle ein neues Item'), null);
  assert.equal(extractRule('Merk dir'), null);
});

test('automatic learning accepts safe preferences and rejects sensitive data', () => {
  assert.equal(validateLearnedRule('Erkläre neue Fachbegriffe zuerst mit einem kurzen Beispiel.'), 'Erkläre neue Fachbegriffe zuerst mit einem kurzen Beispiel');
  assert.equal(validateLearnedRule('Mein Passwort ist korrekt12345'), null);
  assert.equal(validateLearnedRule('Schreib mir an luis@example.com'), null);
  assert.equal(validateLearnedRule('Meine Telefonnummer ist +49 171 1234567'), null);
});

test('Minecraft documentation lookup activates for technical research, not ordinary edits', () => {
  assert.equal(shouldSearchMinecraftDocs('Suche die offizielle Fabric API Doku für Events.'), true);
  assert.equal(shouldSearchMinecraftDocs('Recherchiere in der Dokumentation, warum mein Gradle-Build crasht.'), true);
  assert.equal(shouldSearchMinecraftDocs('Warum crasht mein Gradle-Build?'), false);
  assert.equal(shouldSearchMinecraftDocs('Male eine grüne Textur für mein Item.'), false);
});

test('AI memory persists, scopes project rules, deduplicates, and deletes only visible entries', async (t) => {
  const root = await mkdtemp(join(tmpdir(), 'mod-studio-ai-memory-'));
  t.after(() => rm(root, { recursive: true, force: true }));
  const memory = createAiMemory(join(root, 'ai-memory.json'));
  const projectA = '123e4567-e89b-42d3-a456-426614174000';
  const projectB = '123e4567-e89b-42d3-a456-426614174001';
  await memory.add('Bitte erkläre Minecraft-Begriffe einfach.');
  const projectRules = await memory.add('Dieses Projekt nutzt Fabric.', projectA);
  assert.equal(projectRules.length, 2);
  assert.equal((await memory.list(projectB)).length, 1);
  await memory.add('Dieses Projekt nutzt Fabric.', projectA);
  assert.equal((await memory.list(projectA)).length, 2);
  const rule = projectRules.find((entry) => entry.scope === projectA);
  assert.equal((await memory.remove(rule.id, projectB)).length, 1);
  assert.equal((await memory.remove(rule.id, projectA)).length, 1);
});

test('model-learned rules persist by scope, deduplicate, and ignore unsafe proposals', async (t) => {
  const root = await mkdtemp(join(tmpdir(), 'mod-studio-ai-memory-auto-'));
  t.after(() => rm(root, { recursive: true, force: true }));
  const memory = createAiMemory(join(root, 'ai-memory.json'));
  const projectA = '123e4567-e89b-42d3-a456-426614174000';
  const projectB = '123e4567-e89b-42d3-a456-426614174001';
  const learned = await memory.learnFromProposals([
    { text: 'Erkläre Änderungen erst in einfachen Worten.', scope: 'global' },
    { text: 'Dieses Projekt verwendet Fabric für Minecraft.', scope: 'project' },
    { text: 'Mein API key ist sk-secretsecretsecret', scope: 'global' },
  ], projectA);
  assert.equal(learned.length, 2);
  assert.equal((await memory.list(projectA)).length, 2);
  assert.equal((await memory.list(projectB)).length, 1);
  assert.deepEqual(await memory.learnFromProposals([{ text: 'Erkläre Änderungen erst in einfachen Worten.', scope: 'global' }], projectA), []);
});
