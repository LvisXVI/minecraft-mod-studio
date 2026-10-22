import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtemp, readFile, rm } from 'node:fs/promises';
import { createHash } from 'node:crypto';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { createUpdateService } from '../server/updates.js';
import { createServer } from '../server/http.js';

const API = 'https://api.github.com/repos/LvisXVI/minecraft-mod-studio/releases?per_page=30';

test('update check reports a newer release and exposes only the expected Windows installer', async () => {
  const service = createUpdateService({ currentVersion: '0.1.0-alpha.3', fetchImpl: async (url) => {
    assert.equal(url, API);
    return jsonResponse([{ 
      tag_name: 'v0.1.0-alpha.4',
      html_url: 'https://github.com/LvisXVI/minecraft-mod-studio/releases/tag/v0.1.0-alpha.4',
      body: 'Verbesserte Oberfläche und Updater.',
      assets: [
        { name: 'Mod-Studio-Setup.exe', browser_download_url: 'https://github.com/LvisXVI/minecraft-mod-studio/releases/download/v0.1.0-alpha.4/Mod-Studio-Setup.exe' },
        { name: 'SHA256SUMS.txt', browser_download_url: 'https://github.com/LvisXVI/minecraft-mod-studio/releases/download/v0.1.0-alpha.4/SHA256SUMS.txt' },
        { name: 'Mod-Studio-Portable.zip', browser_download_url: 'https://github.com/LvisXVI/minecraft-mod-studio/releases/download/v0.1.0-alpha.4/Mod-Studio-Portable.zip' },
      ],
    }]);
  } });

  assert.deepEqual(await service.check(), {
    currentVersion: '0.1.0-alpha.3',
    latestVersion: '0.1.0-alpha.4',
    updateAvailable: true,
    releaseUrl: 'https://github.com/LvisXVI/minecraft-mod-studio/releases/tag/v0.1.0-alpha.4',
    releaseNotes: 'Verbesserte Oberfläche und Updater.',
  });
});

test('update install verifies the release checksum before launching the installer', async (t) => {
  const directory = await mkdtemp(join(tmpdir(), 'mod-studio-updater-'));
  t.after(() => rm(directory, { recursive: true, force: true }));
  const installer = Buffer.from('verified setup payload');
  const digest = createHash('sha256').update(installer).digest('hex');
  const calls = [];
  const service = createUpdateService({ currentVersion: '0.1.0-alpha.3', downloadDir: directory,
    fetchImpl: async (url) => {
      calls.push(url);
      if (url === API) return jsonResponse([{ tag_name: 'v0.1.0-alpha.4', html_url: 'https://github.com/LvisXVI/minecraft-mod-studio/releases/tag/v0.1.0-alpha.4', assets: [
        { name: 'Mod-Studio-Setup.exe', browser_download_url: 'https://github.com/LvisXVI/minecraft-mod-studio/releases/download/v0.1.0-alpha.4/Mod-Studio-Setup.exe' },
        { name: 'SHA256SUMS.txt', browser_download_url: 'https://github.com/LvisXVI/minecraft-mod-studio/releases/download/v0.1.0-alpha.4/SHA256SUMS.txt' },
      ] }]);
      if (url.endsWith('/SHA256SUMS.txt')) return new Response(`${digest}  Mod-Studio-Setup.exe\n`, { status: 200 });
      return new Response(installer, { status: 200 });
    },
    launchInstaller: async (path) => calls.push(`launch:${path}`),
  });

  const result = await service.install();
  assert.equal(result.version, '0.1.0-alpha.4');
  assert.match(result.installerPath, /Mod-Studio-Setup-0\.1\.0-alpha\.4\.exe$/);
  assert.deepEqual(await readFile(result.installerPath), installer);
  assert.equal(calls.at(-1), `launch:${result.installerPath}`);
});

test('update install rejects a modified setup and never launches it', async (t) => {
  const directory = await mkdtemp(join(tmpdir(), 'mod-studio-updater-bad-'));
  t.after(() => rm(directory, { recursive: true, force: true }));
  let launched = false;
  const service = createUpdateService({ currentVersion: '0.1.0-alpha.3', downloadDir: directory,
    fetchImpl: async (url) => {
      if (url === API) return jsonResponse([{ tag_name: 'v0.1.0-alpha.4', html_url: 'https://github.com/LvisXVI/minecraft-mod-studio/releases/tag/v0.1.0-alpha.4', assets: [
        { name: 'Mod-Studio-Setup.exe', browser_download_url: 'https://github.com/LvisXVI/minecraft-mod-studio/releases/download/v0.1.0-alpha.4/Mod-Studio-Setup.exe' },
        { name: 'SHA256SUMS.txt', browser_download_url: 'https://github.com/LvisXVI/minecraft-mod-studio/releases/download/v0.1.0-alpha.4/SHA256SUMS.txt' },
      ] }]);
      if (url.endsWith('/SHA256SUMS.txt')) return new Response(`${'0'.repeat(64)}  Mod-Studio-Setup.exe\n`, { status: 200 });
      return new Response('tampered installer', { status: 200 });
    },
    launchInstaller: async () => { launched = true; },
  });

  await assert.rejects(service.install(), /Prüfsumme/);
  assert.equal(launched, false);
});

test('local API exposes the running version and routes explicit update checks and installs', async (t) => {
  const calls = [];
  const server = createServer({ publicDir: tmpdir(), projectStore: {}, services: {}, version: '0.1.0-alpha.4', updates: {
    check: async () => ({ currentVersion: '0.1.0-alpha.4', latestVersion: '0.1.0-alpha.5', updateAvailable: true, releaseUrl: 'https://github.com/LvisXVI/minecraft-mod-studio/releases/tag/v0.1.0-alpha.5', releaseNotes: '' }),
    install: async () => { calls.push('install'); return { version: '0.1.0-alpha.5', releaseUrl: 'https://github.com/LvisXVI/minecraft-mod-studio/releases/tag/v0.1.0-alpha.5' }; },
  } });
  await new Promise((resolve) => server.listen(0, '127.0.0.1', resolve));
  t.after(() => new Promise((resolve) => server.close(resolve)));
  const base = `http://127.0.0.1:${server.address().port}`;

  assert.deepEqual(await (await fetch(`${base}/api/health`)).json(), { ok: true, version: '0.1.0-alpha.4' });
  assert.equal((await (await fetch(`${base}/api/updates`)).json()).updateAvailable, true);
  const installResponse = await fetch(`${base}/api/updates/install`, { method: 'POST' });
  assert.equal(installResponse.status, 202);
  assert.deepEqual(await installResponse.json(), { version: '0.1.0-alpha.5', releaseUrl: 'https://github.com/LvisXVI/minecraft-mod-studio/releases/tag/v0.1.0-alpha.5' });
  assert.deepEqual(calls, ['install']);
});

function jsonResponse(value) { return new Response(JSON.stringify(value), { status: 200, headers: { 'Content-Type': 'application/json' } }); }
