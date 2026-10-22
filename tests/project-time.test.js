import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtemp, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { createProjectStore } from '../server/projects.js';

test('project creation time is saved, sanitized, and listed with its project', async (t) => {
  const root = await mkdtemp(join(tmpdir(), 'mod-studio-project-time-'));
  t.after(() => rm(root, { recursive: true, force: true }));
  const store = createProjectStore(root);
  const created = await store.create({ name: 'Zeitmessung', target: { loader: 'fabric', minecraftVersion: '26.2' } });
  assert.equal(created.timeSpentMs, 0);

  const saved = await store.write(created.id, { ...created, timeSpentMs: 83_400_000 });
  assert.equal(saved.timeSpentMs, 83_400_000);
  assert.equal((await store.read(created.id)).timeSpentMs, 83_400_000);
  assert.equal((await store.list())[0].timeSpentMs, 83_400_000);

  const sanitized = await store.write(created.id, { ...saved, timeSpentMs: -50 });
  assert.equal(sanitized.timeSpentMs, 0);
});
