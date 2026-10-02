import { need, shaOK, uuidOK, refName } from './security.mjs';
import { packScript } from './pack.mjs';
import { applyMigrations, uploadBundle, verifyIdentity } from './bundle.mjs';
import { advanceDefault } from './git.mjs';
const quote = value => `'${String(value).replaceAll("'", "'\\''")}'`;
export const runnerConfig = { retries: { limit: 0, delay: 1000 }, timeout: 1800000, commandTimeoutMs: 1790000, snapshotTtlSeconds: 3600 };

export function buildCommand(sha, projectId) {
  need(shaOK(sha) && uuidOK(projectId), 'Exact project and commit required');
  const pack = `import {readFileSync,readdirSync,realpathSync} from 'node:fs';import {join,relative,resolve,dirname,extname} from 'node:path';import {createHash} from 'node:crypto';\n${packScript()}\nconst result=await packApplication(process.cwd(),${JSON.stringify({ sha, projectId })});console.log('HOSTED_RESULT='+JSON.stringify(result));`;
  return `set -eu\nif [ -d .git ]; then test "$(git rev-parse HEAD)" = ${quote(sha)}; fi\nnpm ci --prefix app\n(cd app && npx --no-install wrangler types && npm test && CLOUDFLARE_ENV=staging npm run build:app)\nnode --input-type=module -e ${quote(pack)}\n`;
}
export async function readResult(logs, sha, projectId, exitCode) {
  need(exitCode === 0, 'Remote checks failed');
  const stdout = typeof logs.stdout === 'string' ? logs.stdout : await new Response(logs.stdout).text();
  need(stdout.length <= 2 * 1024 * 1024, 'Runner logs exceed bounded result size');
  const rows = stdout.split('\n').filter(line => line.startsWith('HOSTED_RESULT='));
  need(rows.length === 1, 'Remote bundle receipt unreadable');
  const result = JSON.parse(rows[0].slice(14));
  need(result.sha === sha && result.projectId === projectId && /^[a-f0-9]{64}$/.test(result.digest || ''), 'Remote receipt identity mismatch');
  return { ...result, exitCode };
}
export async function runHostedPipeline(event, ci, adapters) {
  const p = event.payload;
  need(p.provider === 'cloudflare-artifacts' && p.providerData?.namespace === adapters.config.namespace && p.owner === adapters.config.namespace && uuidOK(p.repo) && shaOK(p.sha), 'Hosted workflow source mismatch');
  refName(p.ref);
  const candidate = await adapters.call('start', { sha: p.sha, ref: p.ref, workflow: event.instanceId });
  let checked;
  try {
    checked = await ci.runner({ name: `hosted-check-build-${candidate.attempts}`, command: buildCommand(p.sha, p.repo), env: { HOSTED_UPLOAD_URL: `${adapters.config.serviceUrl}/v1/bundles/${p.repo}/${p.sha}?ref=${encodeURIComponent(p.ref)}`, HOSTED_UPLOAD_TOKEN: candidate.uploadToken }, cloudflareCredentials: false, sourceControlCredentials: false, config: runnerConfig });
  } catch {
    await adapters.call('fail', { sha: p.sha, ref: p.ref, retryable: true }); return;
  }
  try {
    const result = await readResult(checked.logs, p.sha, p.repo, checked.exitCode);
    const { bundle, state } = await adapters.loadBundle(p.sha, p.ref, result.digest);
    // Trusted migration and upload run in the service; remote candidate commands see neither
    // deployment credentials nor production resources. An upload is never retried blindly.
    await applyMigrations(state, adapters.provider, bundle, 'staging');
    const receipt = await uploadBundle(state, adapters.provider, bundle, 'staging');
    for (let poll = 0; ; poll++) {
      try { await verifyIdentity(state, receipt, p.sha, adapters.fetch); break; }
      catch (error) { if (poll >= 11) throw error; await adapters.sleep(`private-preview-${poll}`, '5 seconds'); }
    }
    await adapters.call('passed', { sha: p.sha, ref: p.ref, result: { ...result, ...receipt } });
  } catch {
    await adapters.call('fail', { sha: p.sha, ref: p.ref, retryable: false });
  }
}
export async function publishBundle(controller, actor, approvalId, adapters) {
  const candidate = await controller.beginPublication(actor, approvalId);
  // The durable reservation precedes any production migration, asset upload or version call.
  // A network error retains it; an operator must reconcile, never reset to approved.
  const { bundle, state } = await adapters.loadBundle(candidate.sha, candidate.ref, candidate.bundleDigest);
  await applyMigrations(state, adapters.provider, bundle, 'production');
  const receipt = await uploadBundle(state, adapters.provider, bundle, 'production');
  state.publication.version = receipt.version; state.publication.target = receipt.target; await controller.save();
  need(await adapters.provider.head(state, refName(candidate.ref)) === candidate.sha && await adapters.provider.mainHead(state) === state.publication.mainBase, 'Repository head changed before exact production deployment; reservation retained');
  await adapters.provider.deploy(receipt.target, receipt.version);
  const url = await adapters.provider.routing(receipt.target);
  await verifyIdentity(state, { ...receipt, url }, candidate.sha, adapters.fetch);
  state.publication.status = 'deployed-awaiting-main'; await controller.save();
  const defaultRef = await advanceDefault(adapters.provider, state, candidate.sha, state.publication.mainBase, () => controller.save());
  return controller.finishPublication(approvalId, { sha: candidate.sha, digest: candidate.bundleDigest, version: receipt.version, url, ...defaultRef });
}
