import { resolve } from 'node:path';

export function controllerConfig(manifest, owner, ownerEmail) {
  const resource = (kind, suffix) => {
    const found = manifest.resources.find(row => row.kind === kind && row.name === `${manifest.prefix}-${suffix}` && row.status === 'created');
    if (!found?.id) throw new Error(`Provisioned ${kind} ${suffix} required`);
    return found;
  };
  const config = {
    account: manifest.account, run: manifest.run, namespace: manifest.namespace,
    repo: resource('repo', 'project').name, owner, ownerEmail,
    staging: resource('worker', 'staging').name, production: resource('worker', 'production').name,
    stagingDB: resource('d1', 'staging').id, productionDB: resource('d1', 'production').id,
  };
  if (manifest.backend === 'direct-api') config.backend = manifest.backend;
  if (manifest.backend === 'workers-builds') {
    const connection = resource('build-connection', 'connection'), trigger = resource('build-trigger', 'managed');
    const repo = resource('repo', 'project');
    config.backend = manifest.backend;
    config.builds = { connection: connection.id, trigger: trigger.id, workerTag: trigger.workerTag, repoID: repo.id };
  }
  if (!owner || !/^[^@\s]+@example\.(com|test)$/.test(ownerEmail || '')) throw new Error('Use a stable subject and invented example.com/example.test owner email');
  const name = resource('worker', 'controller').name;
  return {
    name, account_id: manifest.account, main: resolve(import.meta.dirname, 'worker.mjs'),
    compatibility_date: '2026-10-01', compatibility_flags: ['nodejs_compat'], workers_dev: true,
    artifacts: [{ binding: 'ARTIFACTS', namespace: manifest.namespace }],
    containers: [{ name: `${manifest.prefix}-runner`, class_name: 'CiSandbox', image: 'docker.io/cloudflare/sandbox:0.12.5', max_instances: 1, instance_type: 'standard-1' }],
    durable_objects: { bindings: [{ name: 'SANDBOX', class_name: 'CiSandbox' }, { name: 'PILOT_STATE', class_name: 'PilotState' }] },
    migrations: [{ tag: 'pilot-v1', new_sqlite_classes: ['CiSandbox', 'PilotState'] }],
    workflows: [{ name: `${manifest.prefix}-pipeline`, binding: 'CI_WORKFLOW', class_name: 'CI' }],
    d1_databases: [{ binding: 'MEMORY_DB', database_id: resource('d1', 'memory').id, database_name: resource('d1', 'memory').name }],
    r2_buckets: [{ binding: 'BACKUP_BUCKET', bucket_name: resource('r2', 'cache').name }, { binding: 'MEMORY_BUCKET', bucket_name: resource('r2', 'memory').name }],
    vars: { PILOT_CONFIG: JSON.stringify(config), CLOUDFLARE_ACCOUNT_ID: manifest.account, BACKUP_BUCKET_NAME: resource('r2', 'cache').name },
    triggers: { events: [{ type: 'cf.artifacts.repo.pushed', filter: { namespace: manifest.namespace, repo_name: config.repo }, targets: [{ type: 'workflow', workflow_name: `${manifest.prefix}-pipeline` }] }] },
    observability: { enabled: true },
  };
}
