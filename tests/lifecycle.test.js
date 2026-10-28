import test from 'node:test';
import assert from 'node:assert/strict';
import { EventEmitter } from 'node:events';
import { createLifecycle } from '../server/lifecycle.js';

const stream = () => Object.assign(new EventEmitter(), { write() {} });
const wait = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

test('goes idle only after the last tab is gone for the grace period', async () => {
  let idle = 0;
  const lifecycle = createLifecycle({ enabled: true, graceMs: 40, onIdle: () => { idle += 1; } });
  const a = stream(), b = stream();
  lifecycle.connect(a); lifecycle.connect(b);
  a.emit('close');
  await wait(80);
  assert.equal(idle, 0, 'one tab is still open');
  b.emit('close');
  await wait(80);
  assert.equal(idle, 1);
});

test('a reload that reconnects inside the grace period keeps the app running', async () => {
  let idle = 0;
  const lifecycle = createLifecycle({ enabled: true, graceMs: 60, onIdle: () => { idle += 1; } });
  const first = stream(); lifecycle.connect(first); first.emit('close');
  await wait(20);
  lifecycle.connect(stream());
  await wait(120);
  assert.equal(idle, 0);
});

test('stays running when the feature is off or no tab ever connected', async () => {
  let idle = 0;
  const off = createLifecycle({ enabled: false, graceMs: 10, onIdle: () => { idle += 1; } });
  const s = stream(); off.connect(s); s.emit('close');
  const never = createLifecycle({ enabled: true, graceMs: 10, onIdle: () => { idle += 1; } });
  await wait(60);
  assert.equal(idle, 0);
  assert.equal(never.count(), 0);
});
