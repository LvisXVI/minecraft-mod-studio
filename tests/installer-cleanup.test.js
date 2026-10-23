import test from 'node:test';
import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import { existsSync } from 'node:fs';
import { mkdir, mkdtemp, readFile, readdir, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = resolve(fileURLToPath(new URL('..', import.meta.url)));
const cleanupSource = join(root, 'scripts', 'install-cleanup.cs');

test('Windows setup wires in scoped cleanup of superseded install versions', async () => {
  const [buildScript, source] = await Promise.all([
    readFile(join(root, 'scripts', 'build-setup.ps1'), 'utf8'),
    readFile(cleanupSource, 'utf8'),
  ]);
  assert.match(buildScript, /install-cleanup\.cs/);
  assert.match(buildScript, /CleanupPreviousVersions/);
  assert.match(source, /^\s*internal static class InstallCleanup/m);
  assert.match(source, /VersionDirectory/);
  assert.match(source, /ReparsePoint/);
  assert.match(source, /CleanupPreviousVersions/);
});

test('install cleanup removes old version folders while preserving current and adjacent user data', { skip: process.platform !== 'win32' }, async (t) => {
  const compiler = [join(process.env.WINDIR, 'Microsoft.NET', 'Framework64', 'v4.0.30319', 'csc.exe'), join(process.env.WINDIR, 'Microsoft.NET', 'Framework', 'v4.0.30319', 'csc.exe')].find(existsSync);
  assert.ok(compiler, 'Windows .NET Framework C# compiler path is available');
  const temporary = await mkdtemp(join(tmpdir(), 'mod-studio-installer-cleanup-'));
  t.after(() => rm(temporary, { recursive: true, force: true }));
  const installRoot = join(temporary, 'Programs', 'ModStudio');
  const current = join(installRoot, '0.1.0-alpha.5');
  const old = join(installRoot, '0.1.0-alpha.4');
  const unrelated = join(installRoot, 'notes');
  const userData = join(temporary, 'ModStudio', 'projects');
  await Promise.all([mkdir(current, { recursive: true }), mkdir(old, { recursive: true }), mkdir(unrelated, { recursive: true }), mkdir(userData, { recursive: true })]);
  await writeFile(join(old, 'old.txt'), 'old app');
  await writeFile(join(current, 'current.txt'), 'current app');
  await writeFile(join(unrelated, 'keep.txt'), 'not a version folder');
  await writeFile(join(userData, 'project.json'), 'keep project');
  const harness = join(temporary, 'cleanup-runner.cs');
  const executable = join(temporary, 'cleanup-runner.exe');
  await writeFile(harness, 'using System; internal static class Runner { private static int Main(string[] args) { InstallCleanup.CleanupPreviousVersions(args[0], args[1]); return 0; } }');
  execFileSync(compiler, ['/nologo', '/target:exe', `/out:${executable}`, cleanupSource, harness], { windowsHide: true });
  execFileSync(executable, [installRoot, current], { windowsHide: true });
  await assert.rejects(readdir(old), { code: 'ENOENT' });
  assert.equal(await readFile(join(current, 'current.txt'), 'utf8'), 'current app');
  assert.equal(await readFile(join(unrelated, 'keep.txt'), 'utf8'), 'not a version folder');
  assert.equal(await readFile(join(userData, 'project.json'), 'utf8'), 'keep project');
});

test('install cleanup defers removal of an old version while its launcher is running', { skip: process.platform !== 'win32' }, async (t) => {
  const compiler = [join(process.env.WINDIR, 'Microsoft.NET', 'Framework64', 'v4.0.30319', 'csc.exe'), join(process.env.WINDIR, 'Microsoft.NET', 'Framework', 'v4.0.30319', 'csc.exe')].find(existsSync);
  assert.ok(compiler, 'Windows .NET Framework C# compiler path is available');
  const temporary = await mkdtemp(join(tmpdir(), 'mod-studio-installer-deferred-cleanup-'));
  t.after(() => rm(temporary, { recursive: true, force: true }));
  const installRoot = join(temporary, 'Programs', 'ModStudio');
  const current = join(installRoot, '0.1.0-alpha.5');
  const old = join(installRoot, '0.1.0-alpha.4');
  await Promise.all([mkdir(current, { recursive: true }), mkdir(old, { recursive: true })]);
  await writeFile(join(old, 'old.txt'), 'old app');
  await writeFile(join(current, 'current.txt'), 'current app');
  const harness = join(temporary, 'cleanup-runner.cs');
  const executable = join(old, 'cleanup-runner.exe');
  await writeFile(harness, 'using System; using System.Threading; internal static class Runner { private static int Main(string[] args) { InstallCleanup.CleanupPreviousVersions(args[0], args[1]); Thread.Sleep(1500); return 0; } }');
  execFileSync(compiler, ['/nologo', '/target:exe', `/out:${executable}`, cleanupSource, harness], { windowsHide: true });
  execFileSync(executable, [installRoot, current], { windowsHide: true });

  for (let attempt = 0; attempt < 40; attempt++) {
    try { await readdir(old); } catch (error) { if (error?.code === 'ENOENT') break; throw error; }
    await new Promise((resolveDelay) => setTimeout(resolveDelay, 250));
  }
  await assert.rejects(readdir(old), { code: 'ENOENT' });
  assert.equal(await readFile(join(current, 'current.txt'), 'utf8'), 'current app');
});
