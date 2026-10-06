import test from 'node:test';
import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const scripts = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const script = join(scripts, 'check-skill-actions.mjs');

// The registry is real TypeScript, as in an installed repo: one business key, and the stack's own two.
const REGISTRY = `export type Level = "read" | "write";
type Key = { title: string; secrets: readonly string[]; levels?: readonly Level[]; setup?: true; alone?: true };
export const keys = {
  stripe: { title: "Stripe", secrets: ["STRIPE_SECRET_KEY", "STRIPE_ACCOUNT"] },
  cloudflare: { title: "Cloudflare", secrets: ["WONG_CLOUDFLARE_READ"], levels: ["read"], setup: true },
  code: { title: "Project code", secrets: ["WONG_CODE_READ"], levels: ["read"], alone: true },
} as const satisfies Record<string, Key>;
`;

const actions = (...ids) => `${JSON.stringify({ title: 'Refund an order', actions: ids }, null, 2)}\n`;
const CALL = 'node scripts/company-api.mjs call';

// Runs the check on a throwaway repo holding `files` under .agents/skills/.
function check(t, files, registry = REGISTRY) {
  const root = mkdtempSync(join(tmpdir(), 'wong-test-skill-actions-'));
  t.after(() => rmSync(root, { recursive: true, force: true }));
  const all = {
    ...(registry && { 'app/worker/keys.ts': registry }),
    ...Object.fromEntries(Object.entries(files).map(([path, text]) => [`.agents/skills/${path}`, text])),
  };
  for (const [path, text] of Object.entries(all)) {
    mkdirSync(dirname(join(root, path)), { recursive: true });
    writeFileSync(join(root, path), text);
  }
  const result = spawnSync(process.execPath, [script, '--root', root], { encoding: 'utf8' });
  return { status: result.status, out: `${result.stdout}${result.stderr}` };
}

test('a skill that lists every action it calls passes, and the count says how many declare actions', t => {
  const clean = check(t, {
    'refund/SKILL.md': `# Refund\n\n\`\`\`bash\n${CALL} orders.lookup --file - <<'JSON'\n{"id":"7"}\nJSON\n\`\`\`\n\nThen run \`${CALL} stripe.refund --file -\`.\n`,
    'refund/scripts/refund.mjs': 'const order = await client.call("orders.lookup", { id });\nawait client.call(\'stripe.refund\', order);\n',
    'refund/actions.json': actions('orders.lookup', 'stripe.refund'),
    'notes/SKILL.md': '# Notes\n\nWrites a note. Calls nothing.\n',
  });
  assert.equal(clean.status, 0, clean.out);
  assert.match(clean.out, /skill actions: 2 skill\(s\) read, 1 declaring actions/);
});

test('a skill that names a business key\'s secret fails, naming the skill, the file and the secret', t => {
  const named = check(t, {
    'refund/SKILL.md': '# Refund\n\nRead `STRIPE_SECRET_KEY` from `.env`, then call Stripe.\n',
    'refund/scripts/nested/refund.mjs': 'fetch(url, { headers: { Authorization: process.env.STRIPE_SECRET_KEY, Account: process.env.STRIPE_ACCOUNT } });\n',
    'notes/SKILL.md': '# Notes\n',
  });
  assert.equal(named.status, 1);
  assert.match(named.out, /\.agents\/skills\/refund\/SKILL\.md: the skill "refund" names STRIPE_SECRET_KEY, a secret of the saved key "stripe"/);
  assert.match(named.out, /\.agents\/skills\/refund\/scripts\/nested\/refund\.mjs: the skill "refund" names STRIPE_SECRET_KEY/);
  assert.match(named.out, /\.agents\/skills\/refund\/scripts\/nested\/refund\.mjs: the skill "refund" names STRIPE_ACCOUNT/);
  assert.match(named.out, /3 skill problem\(s\)/);
  assert.doesNotMatch(named.out, /"notes"/);
});

test('the stack\'s own keys, a longer name, and files the check does not read are no mention', t => {
  const own = check(t, {
    // Setup makes one key and the Worker alone uses the other: neither is a business-service key.
    'wong-setup/scripts/provision.mjs': 'const names = ["WONG_CLOUDFLARE_READ", "WONG_CODE_READ"];\n',
    'refund/SKILL.md': '# Refund\n\n`STRIPE_SECRET_KEY_HINT` only starts like a secret.\n',
    'refund/scripts/refund.test.mjs': `const env = { STRIPE_SECRET_KEY: "x" };\nawait client.call("stripe.refund", {});\n// ${CALL} stripe.refund\n`,
    'refund/scripts/node_modules/stripe/index.js': 'module.exports = process.env.STRIPE_SECRET_KEY;\n',
    'refund/assets/logo.bin': 'STRIPE_SECRET_KEY\0\u0001\u0002',
    'refund/assets/export.csv': `${'order,total\n'.repeat(100_000)}STRIPE_SECRET_KEY\n`,
  });
  assert.equal(own.status, 0, own.out);
  assert.match(own.out, /2 skill\(s\) read, 0 declaring actions/);
});

test('a skill that calls an action its actions.json does not list fails, by the command and by the client', t => {
  const unlisted = check(t, {
    'refund/SKILL.md': `# Refund\n\n${CALL} orders.lookup --file -\n${CALL} stripe.refund --file -\n${CALL} stripe.refund --file -\n`,
    'refund/scripts/refund.mjs': 'await client.call("orders.cancel", { id });\nspawnSync("node", ["scripts/company-api.mjs", "call", "orders.reopen", "--file", "-"]);\n',
    'refund/actions.json': actions('orders.lookup'),
  });
  assert.equal(unlisted.status, 1);
  assert.match(unlisted.out, /\.agents\/skills\/refund\/SKILL\.md: the skill "refund" calls stripe\.refund, which its actions\.json does not list/);
  assert.match(unlisted.out, /\.agents\/skills\/refund\/scripts\/refund\.mjs: the skill "refund" calls orders\.cancel, which its actions\.json does not list/);
  assert.match(unlisted.out, /refund\.mjs: the skill "refund" calls orders\.reopen/);
  assert.doesNotMatch(unlisted.out, /calls orders\.lookup/);
  // The same call twice in one file is one line.
  assert.match(unlisted.out, /3 skill problem\(s\)/);
  assert.match(unlisted.out, /list every action it calls in the actions\.json beside its SKILL\.md/);
});

test('a skill that calls an action and has no actions.json fails', t => {
  const none = check(t, {
    'refund/SKILL.md': `# Refund\n\n${CALL} stripe.refund --file -\n`,
    'refund/scripts/refund.mjs': 'await client.call(`orders.lookup`, { id });\n',
  });
  assert.equal(none.status, 1);
  assert.match(none.out, /\.agents\/skills\/refund\/SKILL\.md: the skill "refund" calls stripe\.refund, but has no actions\.json/);
  assert.match(none.out, /\.agents\/skills\/refund\/scripts\/refund\.mjs: the skill "refund" calls orders\.lookup, but has no actions\.json/);
  assert.match(none.out, /2 skill problem\(s\)/);
});

test('a memory read needs no listing, and neither does anything that is not a literal call', t => {
  const reads = check(t, {
    'recall/SKILL.md': `# Recall\n\n${CALL} memory.search --file - <<'JSON'\n{"terms":"delivery"}\nJSON\n`,
    'recall/scripts/recall.mjs': 'await client.call("memory.show", { slug });\nawait client.call(id, input);\nhandler.call(this, "orders.lookup");\n',
    'guide/SKILL.md': '# Guide\n\nFind an action with `node scripts/company-api.mjs list --q orders`, read it with\n`node scripts/company-api.mjs describe orders.lookup`, then run `node scripts/company-api.mjs call <id> --file -`.\nA made-up `node scripts/company-api.mjs call orders.lookupThing` is no action id.\n',
  });
  assert.equal(reads.status, 0, reads.out);
  assert.match(reads.out, /2 skill\(s\) read, 0 declaring actions/);
});

test('an actions.json that is not valid JSON, has no title, or has no list of ids fails', t => {
  const wrong = check(t, {
    'broken/SKILL.md': `# Broken\n\n${CALL} orders.lookup --file -\n`,
    'broken/actions.json': '{ "title": "Broken", "actions": [\n',
    'untitled/SKILL.md': `# Untitled\n\n${CALL} orders.lookup --file -\n${CALL} orders.cancel --file -\n`,
    'untitled/actions.json': '{ "title": " ", "actions": ["orders.lookup"] }\n',
    'unlisted/SKILL.md': '# Unlisted\n',
    'unlisted/actions.json': '{ "title": "Unlisted", "actions": "orders.lookup" }\n',
    'mixed/SKILL.md': '# Mixed\n',
    'mixed/actions.json': '{ "title": "Mixed", "actions": ["orders.lookup", 7] }\n',
    'empty/SKILL.md': '# Empty\n',
    'empty/actions.json': 'null\n',
  });
  assert.equal(wrong.status, 1);
  assert.match(wrong.out, /\.agents\/skills\/broken\/actions\.json: the skill "broken" declares its actions in a file that is not valid JSON/);
  assert.match(wrong.out, /\.agents\/skills\/untitled\/actions\.json: the skill "untitled" declares no "title"/);
  assert.match(wrong.out, /\.agents\/skills\/unlisted\/actions\.json: the skill "unlisted" declares no "actions" list/);
  assert.match(wrong.out, /\.agents\/skills\/mixed\/actions\.json: the skill "mixed" declares no "actions" list/);
  assert.match(wrong.out, /the skill "empty" declares no "title"/);
  assert.match(wrong.out, /the skill "empty" declares no "actions" list/);
  // A list that can be read is still checked; one that can not is named once, not per call.
  assert.match(wrong.out, /the skill "untitled" calls orders\.cancel, which its actions\.json does not list/);
  assert.doesNotMatch(wrong.out, /the skill "broken" calls/);
  assert.match(wrong.out, /7 skill problem\(s\)/);
});

test('a repo with no key registry still checks declared actions, and one with no skills passes', t => {
  const unlisted = check(t, { 'refund/SKILL.md': `# Refund\n\nRead \`STRIPE_SECRET_KEY\`, then ${CALL} stripe.refund --file -\n` }, null);
  assert.equal(unlisted.status, 1);
  assert.match(unlisted.out, /no key registry/);
  assert.match(unlisted.out, /the skill "refund" calls stripe\.refund, but has no actions\.json/);
  assert.match(unlisted.out, /1 skill problem\(s\)/);
  const listed = check(t, { 'refund/SKILL.md': `# Refund\n\n${CALL} stripe.refund --file -\n`, 'refund/actions.json': actions('stripe.refund') }, null);
  assert.equal(listed.status, 0, listed.out);
  assert.match(listed.out, /1 skill\(s\) read, 1 declaring actions/);
  const none = check(t, {});
  assert.equal(none.status, 0, none.out);
  assert.match(none.out, /0 skill\(s\) read/);
});

test('this repo\'s own skills name no business key and list every action they call', () => {
  const result = spawnSync(process.execPath, [script], { encoding: 'utf8' });
  assert.equal(result.status, 0, `${result.stdout}${result.stderr}`);
});
