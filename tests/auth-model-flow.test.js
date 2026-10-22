import test from 'node:test';
import assert from 'node:assert/strict';
import { generateKeyPairSync, sign } from 'node:crypto';
import { mkdtemp, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { createChatGPTAuth } from '../server/auth/oauth.js';

const AUTH = 'https://auth.openai.com';

test('ChatGPT model selection stays local after one explicit plan authorization', async (t) => {
  const dataDir = await mkdtemp(join(tmpdir(), 'mod-studio-auth-'));
  t.after(() => rm(dataDir, { recursive: true, force: true }));
  const previousFetch = globalThis.fetch;
  t.after(() => { globalThis.fetch = previousFetch; });
  const { privateKey, publicKey } = generateKeyPairSync('rsa', { modulusLength: 2048 });
  const jwk = { ...publicKey.export({ format: 'jwk' }), kid: 'test-key', alg: 'RS256', use: 'sig' };
  let authorizationUrl;
  let browserOpenCount = 0;

  globalThis.fetch = async (input, init = {}) => {
    const url = String(input);
    if (url === `${AUTH}/api/accounts/oauth/token`) {
      const form = new URLSearchParams(init.body);
      assert.equal(form.get('grant_type'), 'authorization_code');
      const authUrl = new URL(authorizationUrl);
      const encode = (value) => Buffer.from(JSON.stringify(value)).toString('base64url');
      const header = encode({ alg: 'RS256', kid: 'test-key' });
      const claims = encode({ iss: AUTH, aud: form.get('client_id'), exp: Math.floor(Date.now() / 1000) + 3600, nonce: authUrl.searchParams.get('nonce'), sub: 'user-1', email: 'test@example.com' });
      const unsigned = `${header}.${claims}`;
      const idToken = `${unsigned}.${sign('RSA-SHA256', Buffer.from(unsigned), privateKey).toString('base64url')}`;
      return json({ id_token: idToken, access_token: 'test-access', refresh_token: 'test-refresh', expires_in: 3600, scope: 'openid profile email chatgpt.tokens.use.direct' });
    }
    if (url === `${AUTH}/.well-known/jwks.json`) return json({ keys: [jwk] });
    if (url === 'https://api.openai.com/v1/models') return json({ models: [
      { slug: 'gpt-test-fast', display_name: 'GPT Test Fast', visibility: 'list' },
      { slug: 'gpt-test-pro', display_name: 'GPT Test Pro', visibility: 'list' },
      { slug: 'gpt-test-hidden', display_name: 'Hidden', visibility: 'private' },
    ] });
    throw new Error(`Unexpected fetch: ${url}`);
  };

  const vault = { available: () => true, encrypt: (text) => text, decrypt: (text) => text };
  const auth = createChatGPTAuth({ dataDir, vault, openExternal: async (url) => { authorizationUrl = url; browserOpenCount++; } });
  const started = await auth.beginSignIn();
  assert.equal(started.authorizationUrl, authorizationUrl);
  assert.equal(browserOpenCount, 1);

  const authUrl = new URL(authorizationUrl);
  const callback = new URL(authUrl.searchParams.get('redirect_uri'));
  callback.searchParams.set('state', authUrl.searchParams.get('state'));
  callback.searchParams.set('code', 'test-code');
  callback.searchParams.set('client_id', 'test-client');
  const callbackResponse = await previousFetch(callback);
  assert.equal(callbackResponse.status, 200);
  assert.equal((await auth.status()).planUsageEnabled, true);

  const catalog = await auth.listModels();
  assert.deepEqual(catalog.models.map((model) => model.id), ['gpt-test-fast', 'gpt-test-pro']);
  assert.equal(catalog.selectedModel, 'gpt-test-fast');
  assert.equal(await auth.selectModel('gpt-test-pro'), 'gpt-test-pro');
  assert.equal(browserOpenCount, 1, 'changing a model must not open the authorization browser');

  const reloadedAuth = createChatGPTAuth({ dataDir, vault, openExternal: async () => { browserOpenCount++; } });
  const reloadedCatalog = await reloadedAuth.listModels();
  assert.equal(reloadedCatalog.selectedModel, 'gpt-test-pro', 'the chosen model persists across app restarts');
  assert.equal(browserOpenCount, 1);
});

function json(value) { return new Response(JSON.stringify(value), { status: 200, headers: { 'Content-Type': 'application/json' } }); }
