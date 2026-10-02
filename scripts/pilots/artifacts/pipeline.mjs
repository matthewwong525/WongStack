// Only controller-owned strings are executed in the credentialed runner.
export const runnerConfig = { retries: { limit: 0, delay: 1000 }, timeout: 1800000, commandTimeoutMs: 1790000, snapshotRetentionSeconds: 3600 };
const quote = value => `'${String(value).replaceAll("'", "'\\''")}'`;

export function deploymentCommand(config, artifact, environment) {
  if (!['staging', 'production'].includes(environment)) throw new Error('Unknown deployment environment');
  if (!/^[a-f0-9]{40}$/.test(artifact.sha || '') || !/^[A-Za-z0-9+/=]+$/.test(artifact.code || '')) throw new Error('Malformed immutable deployment artifact');
  const target = config[environment];
  const database = config[`${environment}DB`];
  if (!target?.startsWith(`wong-artifacts-pilot-${config.run}-`) || !database || config.staging === config.production || config.stagingDB === config.productionDB) throw new Error('Unexpected deployment targets or shared staging data');
  const wrangler = { name: target, account_id: config.account, main: 'worker.mjs', compatibility_date: '2026-10-01', workers_dev: true, preview_urls: true, d1_databases: [{ binding: 'DB', database_id: database, database_name: target }] };
  // /tmp has no candidate package/config/hooks, and --no-bundle never evaluates candidate code.
  const setup = `set -eu\nwork=$(mktemp -d /tmp/pilot-deploy.XXXXXX)\ncd "$work"\nprintf %s ${quote(artifact.code)} | base64 -d > worker.mjs\nprintf %s ${quote(JSON.stringify(wrangler))} > wrangler.json\n`;
  return setup + (environment === 'staging'
    ? `npx --yes wrangler@4.146.0 deploy --config wrangler.json --no-bundle\nnpx --yes wrangler@4.146.0 versions upload --config wrangler.json --no-bundle\n`
    : `npx --yes wrangler@4.146.0 deploy --config wrangler.json --no-bundle\n`);
}

export async function readLogs(logs) {
  const read = value => typeof value === 'string' ? value : new Response(value).text();
  return `${await read(logs.stdout)}\n${await read(logs.stderr)}`;
}

export function buildResult(logs, sha, exitCode) {
  const matches = logs.split('\n').filter(line => line.startsWith('PILOT_RESULT='));
  if (matches.length !== 1 || exitCode !== 0) throw new Error('Unreadable check/build result');
  const result = JSON.parse(matches[0].slice('PILOT_RESULT='.length));
  if (result.sha !== sha) throw new Error('Build reported a different commit');
  return { ...result, exitCode };
}

export function deploymentResult(logs, config, environment) {
  const urls = logs.match(/https:\/\/[a-zA-Z0-9.-]+\.workers\.dev\b/g) || [];
  const versions = [...logs.matchAll(/(?:Worker Version ID|Version ID|Current Version ID):\s*([a-f0-9-]{36})/gi)];
  const version = versions.at(-1)?.[1];
  if (!version) throw new Error('Deployment tool reported no immutable version ID');
  const target = config[environment];
  const url = urls.find(value => new URL(value).hostname.startsWith(`${version.slice(0, 8)}-${target}.`));
  if (environment === 'staging' && !url) throw new Error('Deployment tool reported no matching immutable preview URL');
  return { version, url, target, database: config[`${environment}DB`], reported: true };
}

export async function runPipeline(event, ci, controller, config, managed) {
  const p = event.payload;
  if (p.pilotApproval) {
    const candidate = await controller('begin-publication', { id: p.pilotApproval, job: event.instanceId });
    if (candidate.duplicate) return;
    if (['workers-builds', 'direct-api'].includes(config.backend)) {
      if (!managed) throw new Error('Trusted API publication adapter required; reservation retained');
      const result = await managed.publish(candidate);
      await controller('finish-publication', { id: p.pilotApproval, sha: candidate.sha, version: result.version });
      return;
    }
    // A deployment failure keeps the reservation pending: never retry a possibly published version blindly.
    const deployed = await ci.runner({ name: 'trusted-publication', command: deploymentCommand(config, candidate, 'production'), cloudflareCredentials: { accountId: config.account }, sourceControlCredentials: false, config: runnerConfig });
    if (deployed.exitCode !== 0) throw new Error('Publication runner failed; reconcile reservation before retry');
    const result = deploymentResult(await readLogs(deployed.logs), config, 'production');
    await controller('finish-publication', { id: p.pilotApproval, sha: candidate.sha, version: result.version });
    return;
  }
  const candidate = await controller('start', { params: p, job: event.instanceId });
  if (candidate.duplicate) return;
  try {
    if (config.backend === 'workers-builds') {
      if (!managed) throw new Error('Managed preview adapter required');
      const checked = await ci.runner({ name: 'candidate-tests', command: 'npm test', env: { PILOT_COMMIT: p.sha }, cloudflareCredentials: false, sourceControlCredentials: false, config: runnerConfig });
      if (checked.exitCode !== 0) throw new Error('Candidate tests failed; no managed build started');
      const { result, deployment, build } = await managed.preview(p.sha, p.ref, id => controller('build-started', { sha: p.sha, ref: p.ref, id }));
      await controller('preview', { sha: p.sha, ref: p.ref, result, deployment, build });
      return;
    }
    const checked = await ci.runner({ name: 'candidate-check-build', command: 'npm test && npm run build', env: { PILOT_COMMIT: p.sha }, cloudflareCredentials: false, sourceControlCredentials: false, config: runnerConfig });
    const result = buildResult(await readLogs(checked.logs), p.sha, checked.exitCode);
    if (config.backend === 'direct-api') {
      if (!managed) throw new Error('Direct API preview adapter required');
      const deployment = await managed.preview(result, p.sha);
      await controller('preview', { sha: p.sha, ref: p.ref, result, deployment });
      return;
    }
    const deployed = await ci.runner({ name: 'trusted-preview', command: deploymentCommand(config, result, 'staging'), cloudflareCredentials: { accountId: config.account }, sourceControlCredentials: false, config: runnerConfig });
    if (deployed.exitCode !== 0) throw new Error('Preview deployment runner failed');
    const deployment = deploymentResult(await readLogs(deployed.logs), config, 'staging');
    await controller('preview', { sha: p.sha, ref: p.ref, result, deployment });
  } catch (error) {
    await controller('fail', { sha: p.sha, ref: p.ref });
    throw error;
  }
}
