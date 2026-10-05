import test from 'node:test';
import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const scripts = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const script = join(scripts, 'check-app-keys.mjs');

// The registry is real TypeScript, as in an installed repo: the check reads it as it is.
const REGISTRY = `export type Level = "read" | "write";
type Key = { title: string; secrets: readonly string[]; levels?: readonly Level[] };
export const keys = {
  stripe: { title: "Stripe", secrets: ["STRIPE_SECRET_KEY", "STRIPE_ACCOUNT"] },
  maps: { title: "Maps", secrets: ["MAPS_KEY"], levels: ["read"] },
} as const satisfies Record<string, Key>;
`;

// Runs the check on a throwaway repo holding `files` under app/worker/.
function check(t, files, registry = REGISTRY) {
  const root = mkdtempSync(join(tmpdir(), 'wong-test-app-keys-'));
  t.after(() => rmSync(root, { recursive: true, force: true }));
  const all = { ...(registry && { 'keys.ts': registry }), ...files };
  for (const [path, text] of Object.entries(all)) {
    mkdirSync(dirname(join(root, 'app/worker', path)), { recursive: true });
    writeFileSync(join(root, 'app/worker', path), text);
  }
  const result = spawnSync(process.execPath, [script, '--root', root], { encoding: 'utf8' });
  return { status: result.status, out: `${result.stdout}${result.stderr}` };
}

test('an app that lists the keys its code names passes, by its api.ts or by the action itself', t => {
  const listed = check(t, {
    'apps/orders/api.ts': 'import { refund } from "./refund.ts";\nexport const keys = ["stripe"];\nexport const routes = new Map([["POST refund", refund]]);\n',
    'apps/orders/refund.ts': 'export const refund = (_request, env) => fetch("https://api.stripe.com", { headers: { Authorization: env.STRIPE_SECRET_KEY } });\n',
    'apps/orders/client.ts': 'export const account = env => env.STRIPE_ACCOUNT;\n',
    'apps/deliveries/api.ts': 'export const routes = new Map();\n',
    'apps/deliveries/route.ts': 'export const route = defineAction({ operationId: "deliveries.route",\n  keys: [\'maps\'], handler: (_request, env) => env.MAPS_KEY });\n',
    'apps/notes/api.ts': 'export const routes = new Map(); // names no key\n',
    'api/router.ts': 'const routeAccess = new Map([["GET /api/charges", { apps: ["orders"], keys: ["stripe"] }]]);\n',
    'api/charges.ts': 'export const charges = (_request, env) => env.STRIPE_SECRET_KEY;\n',
    'api/places.ts': 'export const places = defineAction({ keys: ["maps"] as const, handler: (_request, env) => env.MAPS_KEY });\n',
  });
  assert.equal(listed.status, 0, listed.out);
  assert.match(listed.out, /every saved key named in 3 app\(s\) and the main handlers is listed/);
});

test('a handler that names a key its route does not list fails, naming the file, the secret and the key', t => {
  const unlisted = check(t, {
    'apps/orders/api.ts': 'export const keys = ["maps"];\nexport const routes = new Map();\n',
    'apps/orders/refund.ts': 'export const refund = (_request, env) => env.STRIPE_SECRET_KEY;\n',
    'apps/deliveries/api.ts': 'export const routes = new Map();\n',
    'apps/deliveries/nested/route.ts': 'export const route = (_request, env) => env.MAPS_KEY;\n',
    'api/router.ts': 'const routeAccess = new Map([["GET /api/charges", { apps: ["orders"] }]]);\n',
    'api/charges.ts': 'export const charges = (_request, env) => [env.STRIPE_SECRET_KEY, env.STRIPE_ACCOUNT];\n',
  });
  assert.equal(unlisted.status, 1);
  assert.match(unlisted.out, /app\/worker\/apps\/orders\/refund\.ts: names STRIPE_SECRET_KEY, but its route does not list the key "stripe"/);
  assert.match(unlisted.out, /app\/worker\/apps\/deliveries\/nested\/route\.ts: names MAPS_KEY, but its route does not list the key "maps"/);
  assert.match(unlisted.out, /app\/worker\/api\/charges\.ts: names STRIPE_SECRET_KEY/);
  assert.match(unlisted.out, /app\/worker\/api\/charges\.ts: names STRIPE_ACCOUNT/);
  assert.match(unlisted.out, /4 saved key\(s\) named but not listed/);
  // A key listed by another app, or by a test file, lists nothing here.
  const elsewhere = check(t, {
    'apps/orders/api.ts': 'export const routes = new Map();\n',
    'apps/orders/refund.ts': 'export const refund = (_request, env) => env.STRIPE_SECRET_KEY;\n',
    'apps/orders/refund.test.ts': 'export const keys = ["stripe"];\n',
    'apps/payroll/api.ts': 'export const keys = ["stripe"];\nexport const routes = new Map();\n',
  });
  assert.equal(elsewhere.status, 1);
  assert.match(elsewhere.out, /1 saved key\(s\) named but not listed/);
});

test('a longer name that only starts like a secret is no mention, and a test file is not read', t => {
  const near = check(t, {
    'apps/orders/api.ts': 'export const routes = new Map();\n',
    'apps/orders/refund.ts': 'export const refund = (_request, env) => env.MAPS_KEY_HINT;\n',
    'apps/orders/refund.test.ts': 'const env = { STRIPE_SECRET_KEY: "x" };\n',
    'api/health.test.ts': 'const env = { MAPS_KEY: "x" };\n',
  });
  assert.equal(near.status, 0, near.out);
});

test('a repo with no registry, or with no apps, has nothing to check', t => {
  const none = check(t, { 'api/health.ts': 'export const health = () => new Response();\n' }, null);
  assert.equal(none.status, 0);
  assert.match(none.out, /no key registry/);
  const empty = check(t, {});
  assert.equal(empty.status, 0, empty.out);
  assert.match(empty.out, /0 app\(s\)/);
});

test('this repo lists every key its own apps and handlers name', () => {
  const result = spawnSync(process.execPath, [script], { encoding: 'utf8' });
  assert.equal(result.status, 0, `${result.stdout}${result.stderr}`);
});
