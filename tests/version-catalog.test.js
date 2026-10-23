import test from 'node:test';
import assert from 'node:assert/strict';
import { createVersionCatalog, extractMavenVersions, filterMinecraftReleases, mapNeoForgeMinecraftVersion } from '../server/version-catalog.js';

test('Minecraft release catalog includes every official release from 1.12.2 through latest', () => {
  const versions = [
    { id: '26.3', type: 'release' },
    { id: '26.3-snapshot-1', type: 'snapshot' },
    { id: '1.13', type: 'release' },
    { id: '1.12.2', type: 'release' },
    { id: '1.12.1', type: 'release' },
  ];
  assert.deepEqual(filterMinecraftReleases(versions), ['1.12.2', '1.13', '26.3']);
});

test('Maven metadata is parsed and NeoForge version prefixes map to game versions', () => {
  const versions = extractMavenVersions('<metadata><versioning><versions><version>1.12.2-14.23.5</version><version>26.3.0.1</version></versions></versioning></metadata>');
  assert.deepEqual(versions, ['1.12.2-14.23.5', '26.3.0.1']);
  const releases = ['1.12.2', '1.20.1', '1.21', '1.21.1', '26.3'];
  assert.equal(mapNeoForgeMinecraftVersion('20.1.8', releases), '1.20.1');
  assert.equal(mapNeoForgeMinecraftVersion('21.1.42', releases), '1.21.1');
  assert.equal(mapNeoForgeMinecraftVersion('26.3.0.1', releases), '26.3');
  assert.equal(mapNeoForgeMinecraftVersion('14.23.5', releases), null);
});

test('loader catalog only advertises releases from each loader metadata source', async () => {
  const fixtures = new Map([
    ['piston-meta.mojang.com', JSON.stringify({ versions: [
      { id: '26.3', type: 'release' }, { id: '26.3-snapshot-1', type: 'snapshot' },
      { id: '1.21.1', type: 'release' }, { id: '1.20.1', type: 'release' }, { id: '1.12.2', type: 'release' },
    ] })],
    ['meta.fabricmc.net', JSON.stringify([{ version: '26.3', stable: true }, { version: '1.20.1', stable: true }, { version: '26.3-pre-1', stable: false }])],
    ['meta.quiltmc.org', JSON.stringify([{ version: '1.21.1', stable: true }, { version: '1.12.2', stable: false }])],
    ['maven.minecraftforge.net', '<metadata><versions><version>1.12.2-14.23.5</version><version>1.20.1-47.2.0</version></versions></metadata>'],
    ['maven.neoforged.net', '<metadata><versions><version>20.1.8</version><version>21.1.42</version><version>26.3.0.1</version></versions></metadata>'],
  ]);
  const catalog = createVersionCatalog({ fetchImpl: async (url) => {
    const body = [...fixtures].find(([host]) => url.includes(host))?.[1];
    return { ok: Boolean(body), status: body ? 200 : 503, json: async () => JSON.parse(body), text: async () => body };
  } });
  const result = await catalog();
  assert.deepEqual(result.versions, ['1.12.2', '1.20.1', '1.21.1', '26.3']);
  assert.deepEqual(result.loaders.find((entry) => entry.id === 'fabric').versions, ['26.3', '1.20.1']);
  assert.deepEqual(result.loaders.find((entry) => entry.id === 'quilt').versions, ['1.21.1']);
  assert.deepEqual(result.loaders.find((entry) => entry.id === 'forge').versions, ['1.20.1', '1.12.2']);
  assert.deepEqual(result.loaders.find((entry) => entry.id === 'neoforge').versions, ['26.3', '1.21.1', '1.20.1']);
  assert.deepEqual(result.loaders.find((entry) => entry.id === 'fabric').buildVersions, ['26.2']);
});

test('offline catalog has a bundled 1.12.2 to current release fallback', async () => {
  const catalog = createVersionCatalog({ fetchImpl: async () => { throw new Error('offline'); } });
  const result = await catalog();
  assert.equal(result.versions[0], '1.12.2');
  assert.equal(result.versions.at(-1), '26.3');
  assert.ok(result.loaders.find((entry) => entry.id === 'fabric').versions.includes('26.2'));
  assert.ok(result.loaders.find((entry) => entry.id === 'fabric').versions.includes('26.3'));
  assert.ok(result.loaders.find((entry) => entry.id === 'quilt').versions.length > 0);
  assert.ok(result.loaders.find((entry) => entry.id === 'forge').versions.includes('1.12.2'));
  assert.ok(result.loaders.find((entry) => entry.id === 'neoforge').versions.includes('26.3'));
});
