import assert from 'node:assert/strict';
import { readFileSync, existsSync } from 'node:fs';
import { test } from 'node:test';
test('fixture identity and canary routes exist, and the injected red case fails', () => {
  assert.equal(existsSync('FAIL_CHECK'), false, 'Injected failing candidate');
  const code = readFileSync('worker.mjs', 'utf8');
  assert.match(code, /__PILOT_COMMIT__/);
  assert.match(code, /staging-write/);
  for (const secret of ['CF_TOKEN', 'CLOUDFLARE_API_TOKEN', 'BUILDS_API_TOKEN', 'SESSION_SECRET', 'R2_ACCESS_KEY_ID', 'R2_SECRET_ACCESS_KEY']) assert.equal(process.env[secret], undefined, `Candidate inherited ${secret}`);
});
