import assert from 'node:assert/strict';
import { test } from 'node:test';
import { privateDeployment } from '../lib-access-config.mjs';

const vars = {
  WONG_ENVIRONMENT: 'production', CF_ACCESS_TEAM_DOMAIN: 'team.cloudflareaccess.com',
  CF_ACCESS_AUD: 'workspace-audience', CF_ACCESS_APP_ID: 'workspace-app', CF_ACCESS_WORKER_ID: 'a'.repeat(32),
};
const config = () => ({ name: 'workspace', assets: { run_worker_first: true }, vars: { ...vars }, env: { staging: { name: 'workspace-staging', vars: { ...vars, WONG_ENVIRONMENT: 'staging', CF_ACCESS_WORKER_ID: 'b'.repeat(32) } } } });

test('production, staging and a flattened preview require complete protected configuration', () => {
  const valid = config();
  assert.equal(privateDeployment(valid).workerId, 'a'.repeat(32));
  assert.equal(privateDeployment(valid, 'staging').workerId, 'b'.repeat(32));
  assert.equal(privateDeployment({ ...valid.env.staging, assets: valid.assets }, 'staging').environment, 'staging');
  for (const key of ['CF_ACCESS_AUD', 'CF_ACCESS_TEAM_DOMAIN', 'CF_ACCESS_WORKER_ID', 'CF_ACCESS_APP_ID']) {
    const broken = config();
    delete broken.vars[key];
    assert.throws(() => privateDeployment(broken), /identifiers are incomplete/);
  }
});

test('deployment rejects every local bypass and asset path that could skip the Worker', () => {
  for (const value of [true, 'true', 'false']) {
    const broken = config();
    broken.vars.SKIP_AUTH = value;
    assert.throws(() => privateDeployment(broken), /substitution cannot deploy/);
  }
  for (const value of [false, undefined, ['/api/*', '/apps/*']]) {
    const broken = config();
    broken.assets.run_worker_first = value;
    assert.throws(() => privateDeployment(broken), /every asset/);
  }
  const local = config();
  local.vars.WONG_ENVIRONMENT = 'local';
  assert.throws(() => privateDeployment(local), /substitution cannot deploy/);
  assert.throws(() => privateDeployment(config(), 'local'), /only protected/);
  const memory = config();
  memory.env.staging.d1_databases = [{ binding: 'MEMORY_DB' }];
  assert.throws(() => privateDeployment(memory, 'staging'), /must not bind production memory/);
});
