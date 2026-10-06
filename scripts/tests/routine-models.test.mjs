// Which model a routine runs on: scripts/routine-runner/models.mjs. No network and no pi-ai here;
// the names are held to what the pinned pi-ai reads by the trial, not by this file.
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';
import { GATEWAY, ModelError, SERVICES, SHORTLIST, candidatesFor, chosen, gatewayEnv, keyEnv, keyPlan, modelEnv, serviceName, services, shortlist } from '../routine-runner/models.mjs';

const refused = (code, message) => (error) => error instanceof ModelError && error.code === code && (!message || message.test(error.message));
const ZAI_KEY = `${'0123456789abcdef'.repeat(2)}.AbCdEf123456`;

test('the shortlist is three models, the recommended one first, and a copy each time', () => {
  const listed = shortlist();
  assert.equal(listed.length, 3);
  assert.deepEqual(listed.map((model) => model.recommended), [true, false, false]);
  assert.deepEqual(listed, SHORTLIST);
  for (const model of listed) assert.deepEqual([typeof model.id, typeof model.name, typeof model.billing], ['string', 'string', 'string']);
  assert.ok(listed.slice(0, 2).every((model) => model.id.startsWith('workers-ai/')), 'the recommended picks need no credit');
  listed[0].id = 'changed';
  assert.notEqual(shortlist()[0].id, 'changed');
});

test('each key shape names its services in order', () => {
  const cases = [
    ['sk-ant-oat01-subscription', ['anthropic']], ['sk-ant-api03-paid', ['anthropic']], ['sk-or-v1-abc', ['openrouter']], ['sk-proj-abc', ['openai']],
    ['sk-svcacct-abc', ['openai']], ['AIzaSyAbc', ['google']], ['gsk_abc', ['groq']], ['xai-abc', ['xai']], [ZAI_KEY, ['zai']],
    ['sk-0123456789abcdef', ['openai', 'deepseek', 'moonshotai']], [`  ${ZAI_KEY}\n`, ['zai']],
  ];
  for (const [key, expected] of cases) assert.deepEqual(candidatesFor(key), expected, key);
});

test('a shape nobody is known for names no service', () => {
  for (const key of ['', undefined, 'hello', 'pk-abc', 'ghp_abc', '0123.abc', `${'g'.repeat(32)}.abc`]) assert.deepEqual(candidatesFor(key), [], String(key));
  assert.throws(() => keyPlan({ key: 'a-key-of-no-known-shape' }), (error) => refused('provider', /can't be told from its shape/)(error) && error.extra.services.length === Object.keys(SERVICES).length);
  assert.throws(() => keyPlan({ key: '  ' }), refused('key', /No model key was given/));
  assert.throws(() => keyPlan(), refused('key'));
});

test('a key is tested against each service its shape names, on that service\'s own model', () => {
  assert.deepEqual(keyPlan({ key: ZAI_KEY }), [{ provider: 'zai', model: 'glm-5.3' }]);
  assert.deepEqual(keyPlan({ key: 'sk-0123456789abcdef' }), [{ provider: 'openai', model: 'gpt-5.5' }, { provider: 'deepseek', model: 'deepseek-v4-pro' }, { provider: 'moonshotai', model: 'kimi-k2.6' }]);
  for (const { provider, name, model } of services()) {
    assert.deepEqual([typeof name, typeof model], ['string', 'string'], provider);
    assert.ok(model.length > 0 && keyEnv(provider), `${provider} has a model and a name pi-ai reads`);
  }
  assert.deepEqual(services().map((service) => service.provider), ['anthropic', 'openrouter', 'openai', 'google', 'groq', 'xai', 'zai', 'deepseek', 'moonshotai']);
});

test('--provider and --model replace what the shape would pick', () => {
  assert.deepEqual(keyPlan({ key: 'sk-0123456789abcdef', provider: 'deepseek' }), [{ provider: 'deepseek', model: 'deepseek-v4-pro' }]);
  assert.deepEqual(keyPlan({ key: 'sk-0123456789abcdef', model: 'gpt-5.4-mini' }).map((each) => each.model), ['gpt-5.4-mini', 'gpt-5.4-mini', 'gpt-5.4-mini']);
  assert.deepEqual(keyPlan({ key: 'a-key-of-no-known-shape', provider: 'zai', model: 'glm-5.3-flash' }), [{ provider: 'zai', model: 'glm-5.3-flash' }]);
  assert.deepEqual(keyPlan({ key: 'a-key-of-no-known-shape', provider: 'mistral', model: 'devstral-medium-latest' }), [{ provider: 'mistral', model: 'devstral-medium-latest' }]);
});

test('a service outside the list needs a model, and one that takes no pasted key is refused', () => {
  assert.throws(() => keyPlan({ key: 'a-key', provider: 'mistral' }), refused('model', /"mistral" has no model set here/));
  for (const provider of ['openai-codex', 'github-copilot', 'amazon-bedrock', GATEWAY, 'no-such-service']) {
    assert.throws(() => keyPlan({ key: 'a-key', provider, model: 'x' }), refused('provider', /is not a service that takes a pasted key/), provider);
  }
});

test('each service\'s key goes under the one name pi-ai reads', () => {
  const names = {
    anthropic: 'ANTHROPIC_API_KEY', openrouter: 'OPENROUTER_API_KEY', openai: 'OPENAI_API_KEY', google: 'GEMINI_API_KEY', groq: 'GROQ_API_KEY', xai: 'XAI_API_KEY',
    zai: 'ZAI_API_KEY', deepseek: 'DEEPSEEK_API_KEY', moonshotai: 'MOONSHOT_API_KEY',
  };
  assert.deepEqual(Object.fromEntries(Object.keys(SERVICES).map((provider) => [provider, keyEnv(provider, 'a-key')])), names);
  assert.equal(keyEnv('anthropic', 'sk-ant-oat01-subscription'), 'ANTHROPIC_OAUTH_TOKEN', 'a Claude subscription token is a bearer, under its own name');
  assert.equal(keyEnv('anthropic', 'sk-ant-api03-paid'), 'ANTHROPIC_API_KEY');
  assert.equal(keyEnv('openai', 'sk-ant-oat01-not-theirs'), 'OPENAI_API_KEY');
  assert.equal(keyEnv('no-such-service'), null);
  assert.equal(keyEnv(GATEWAY), null, 'Cloudflare\'s AI service is reached with the install\'s own token, never a pasted key');
});

test('the model in use is the pasted key when one is in use, else the Cloudflare pick, else none', () => {
  const key = { provider: 'zai', model: 'glm-5.3' };
  assert.equal(chosen(undefined), null);
  assert.equal(chosen({ use: null, cloudflare: null, key: null }), null);
  assert.deepEqual(chosen({ use: 'cloudflare', cloudflare: 'claude-sonnet-5', key: null }), { via: 'cloudflare', provider: GATEWAY, model: 'claude-sonnet-5' });
  assert.deepEqual(chosen({ use: 'key', cloudflare: 'claude-sonnet-5', key }), { via: 'key', ...key });
  assert.deepEqual(chosen({ use: 'cloudflare', cloudflare: 'claude-sonnet-5', key }), { via: 'cloudflare', provider: GATEWAY, model: 'claude-sonnet-5' });
  assert.equal(chosen({ use: 'key', cloudflare: null, key: null }), null);
});

test('a model request is given the gateway\'s three names or the one key, and nothing else', () => {
  const held = { key: ZAI_KEY, token: 'cf-ai-run-token', account: 'a'.repeat(32), gateway: 'demo-routines' };
  const gateway = { CLOUDFLARE_API_KEY: 'cf-ai-run-token', CLOUDFLARE_ACCOUNT_ID: 'a'.repeat(32), CLOUDFLARE_GATEWAY_ID: 'demo-routines' };
  assert.deepEqual(gatewayEnv(held), gateway);
  assert.deepEqual(modelEnv({ via: 'cloudflare', provider: GATEWAY, model: 'claude-sonnet-5' }, held), gateway);
  assert.deepEqual(modelEnv({ via: 'key', provider: 'zai', model: 'glm-5.3' }, held), { ZAI_API_KEY: ZAI_KEY });
  assert.deepEqual(modelEnv({ via: 'key', provider: 'anthropic', model: 'claude-sonnet-5' }, { ...held, key: 'sk-ant-oat01-x' }), { ANTHROPIC_OAUTH_TOKEN: 'sk-ant-oat01-x' });
  for (const lacking of [{ ...held, token: '' }, { ...held, account: undefined }, { ...held, gateway: undefined }]) assert.equal(modelEnv({ via: 'cloudflare', provider: GATEWAY, model: 'x' }, lacking), null);
  assert.equal(modelEnv({ via: 'key', provider: 'zai', model: 'glm-5.3' }, { ...held, key: undefined }), null);
  assert.equal(modelEnv({ via: 'key', provider: 'no-such-service', model: 'x' }, held), null);
  assert.equal(modelEnv(null, held), null);
  assert.equal(modelEnv({ via: 'key', provider: 'zai', model: 'glm-5.3' }), null);
});

test('a provider is shown by its service\'s name', () => {
  assert.deepEqual([serviceName('zai'), serviceName(GATEWAY), serviceName('mistral')], ['Z.ai Coding Plan', 'Cloudflare', 'mistral']);
});

test('the module imports nothing, so the Worker, the client, and these tests all run it', () => {
  const source = readFileSync(new URL('../routine-runner/models.mjs', import.meta.url), 'utf8');
  assert.doesNotMatch(source, /^import /m);
  assert.doesNotMatch(source, /\bfetch\(/);
});
