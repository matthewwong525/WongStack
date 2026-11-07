// The app's short address: the live Worker answers at admin.wongstack.com and keeps its workers.dev address, and no
// environment takes the name. wiki/maintaining/admin-address.md says why each holds.
import test from 'node:test';
import assert from 'node:assert/strict';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { isDeepStrictEqual } from 'node:util';
import { parseConfig } from '../lib-wrangler-config.mjs';

const repo = resolve(dirname(fileURLToPath(import.meta.url)), '../..');
const APP_CONFIG = 'app/wrangler.jsonc';
const NAME = 'admin.wongstack.com';
const real = () => parseConfig(join(repo, APP_CONFIG));

// Why deploying `config` would not give admin.wongstack.com to the live app alone, or null. A wrangler environment
// inherits the top-level `routes`, so one with no empty list of its own takes the name on a branch deploy.
function domainProblem(config) {
  if (!isDeepStrictEqual(config.routes, [{ pattern: NAME, custom_domain: true }])) {
    return `${APP_CONFIG} must list exactly ${NAME} as its top-level \`routes\`, with \`custom_domain: true\`: a publish attaches what the list names.`;
  }
  if (config.workers_dev !== true) {
    return `${APP_CONFIG} must keep \`"workers_dev": true\`: with \`routes\` declared and that key absent, wrangler turns the workers.dev address off, and the computer's tools lose their address.`;
  }
  const taker = Object.entries(config.env ?? {}).find(([, block]) => !isDeepStrictEqual(block?.routes, []));
  if (!taker) return null;
  return `env.${taker[0]} in ${APP_CONFIG} must declare \`"routes": []\`: an environment inherits the top-level routes, so a preview would take ${NAME} from the live app.`;
}

test('the live app answers at admin.wongstack.com and workers.dev, and no environment takes the name', () => {
  const config = real();
  assert.ok(config.env?.staging && config.env?.local, `${APP_CONFIG} must keep env.staging and env.local`);
  assert.equal(domainProblem(config), null);
});

test('a config that would move the name or lose workers.dev is refused, naming the problem', () => {
  // The real config with one thing changed, and why it is refused.
  const broken = change => {
    const config = real();
    change(config);
    return domainProblem(config);
  };

  for (const [name, change] of [
    ['staging with no routes', config => { delete config.env.staging.routes; }],
    ['staging with the name', config => { config.env.staging.routes = [{ pattern: NAME, custom_domain: true }]; }],
  ]) {
    assert.match(broken(change), /env\.staging/, name);
    assert.match(broken(change), /"routes": \[\]/, name);
  }
  assert.match(broken(config => { config.env.trial = { name: 'wongstack-trial' }; }), /env\.trial/);

  for (const [name, change] of [
    ['no routes at all', config => { delete config.routes; }],
    ['a second name', config => { config.routes.push({ pattern: 'app.wongstack.com', custom_domain: true }); }],
    ['a route that is not a custom domain', config => { config.routes[0] = { pattern: NAME }; }],
  ]) {
    assert.match(broken(change), /top-level `routes`/, name);
  }
  assert.match(broken(config => { delete config.workers_dev; }), /workers_dev.*computer's tools lose their address/);
});
