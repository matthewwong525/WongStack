import { resolve } from 'node:path';
import { readFileSync, writeFileSync } from 'node:fs';
import { need, https, uuidOK } from './security.mjs';

export function serviceConfig(input) {
  need(/^[a-f0-9]{32}$/.test(input.account || '') && /^[a-z0-9-]{3,10}$/.test(input.prefix || '') && /^[a-z0-9-]{3,32}$/.test(input.namespace || ''), 'Explicit account, prefix (3–10 characters) and namespace required');
  https(input.serviceUrl); https(input.cloudUrl);
  need(Array.isArray(input.sourceRepos) && input.sourceRepos.length && input.sourceRepos.every(x => /^[A-Za-z0-9_.-]+\/[A-Za-z0-9_.-]+$/.test(x)), 'Reviewed public source repositories required');
  const config = { ...input, maxQueued: 16, maxAttempts: 3, candidateTimeoutMs: 1800000, retentionDays: 30 };
  return {
    name: `${input.prefix}-service`, account_id: input.account, main: resolve(import.meta.dirname, 'worker.mjs'),
    compatibility_date: '2026-10-01', compatibility_flags: ['nodejs_compat'], workers_dev: true,
    artifacts: [{ binding: 'ARTIFACTS', namespace: input.namespace }],
    containers: [{ name: `${input.prefix}-runner`, class_name: 'CiSandbox', image: 'docker.io/cloudflare/sandbox:0.12.5', max_instances: 2, instance_type: 'standard-1' }],
    durable_objects: { bindings: [{ name: 'SANDBOX', class_name: 'CiSandbox' }, { name: 'PROJECTS', class_name: 'HostedProject' }] },
    migrations: [{ tag: 'hosted-v1', new_sqlite_classes: ['CiSandbox', 'HostedProject'] }],
    workflows: [{ name: `${input.prefix}-pipeline`, binding: 'CI_WORKFLOW', class_name: 'HostedCI' }],
    r2_buckets: [{ binding: 'BACKUP_BUCKET', bucket_name: `${input.prefix}-cache` }, { binding: 'BUNDLES', bucket_name: `${input.prefix}-bundles` }],
    vars: { HOSTED_CONFIG: JSON.stringify(config), CLOUDFLARE_ACCOUNT_ID: input.account, BACKUP_BUCKET_NAME: `${input.prefix}-cache` },
    observability: { enabled: true },
  };
}
export function inventory(input, projectIds = []) {
  serviceConfig(input);
  need(projectIds.length <= 4 && projectIds.every(uuidOK), 'At most four explicit project IDs');
  return {
    account: input.account, namespace: input.namespace, prefix: input.prefix,
    shared: [{ kind: 'namespace', name: input.namespace }, { kind: 'worker', name: `${input.prefix}-service` }, { kind: 'workflow', name: `${input.prefix}-pipeline` }, { kind: 'container', name: `${input.prefix}-runner` }, { kind: 'r2', name: `${input.prefix}-cache` }, { kind: 'r2', name: `${input.prefix}-bundles` }],
    projects: projectIds.map(id => ({ id, resources: [{ kind: 'repo', name: id }, ...['production', 'staging', 'memory'].flatMap(environment => [{ kind: 'worker', name: `${input.prefix}-${id}-${environment}` }, { kind: 'd1', name: `${input.prefix}-${id}-${environment}` }]), { kind: 'r2', name: `${input.prefix}-${id}-memory` }, { kind: 'access-app', name: `WongStack hosted ${id}` }, { kind: 'access-policy', name: `WongStack hosted ${id} people` }, { kind: 'access-policy', name: `WongStack hosted ${id} verification` }, { kind: 'access-service-token', name: `WongStack hosted ${id} verification` }] })),
    bounds: { maxProjects: 4, maxCandidatesPerProject: 16, maxAttemptsPerCandidate: 3, runnerMinutes: 30, maxRunnerInstances: 2, bundleMiB: 64, maxSiteResponseMiB: 16 },
    secrets: ['ADMIN_TOKEN', 'CF_TOKEN', 'R2_ACCESS_KEY_ID', 'R2_SECRET_ACCESS_KEY'],
  };
}
if (process.argv[1] && resolve(process.argv[1]) === resolve(import.meta.filename)) {
  const [operation, inputFile, outputFile] = process.argv.slice(2);
  const input = JSON.parse(readFileSync(inputFile, 'utf8'));
  const result = operation === 'inventory' ? inventory(input, input.projectIds) : operation === 'config' ? serviceConfig(input) : null;
  need(result && outputFile, 'Use config|inventory input.json output.json');
  writeFileSync(outputFile, JSON.stringify(result, null, 2) + '\n', { mode: 0o600 });
}
