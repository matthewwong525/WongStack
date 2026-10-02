import { digest, to64 } from '../../server/hosted/security.mjs';
import { ProjectController, initialProject } from '../../server/hosted/project.mjs';
export const projectId = '12345678-1234-1234-1234-123456789abc';
export const versionId = '87654321-4321-4321-4321-cba987654321';
export const sha = 'a'.repeat(40);
export const older = 'b'.repeat(40);
export const ref = 'refs/heads/feature';
export const config = { account: 'c'.repeat(32), namespace: 'hosted-test', prefix: 'wstest', serviceUrl: 'https://service.example.com', cloudUrl: 'https://cloud.example.com', sourceRepos: ['owner/source'], maxQueued: 16, maxAttempts: 3, candidateTimeoutMs: 1800000 };
export async function fixture() {
  const state = initialProject();
  const writes = [], operations = [];
  const provider = {
    prepare: async () => `https://${config.account}.artifacts.cloudflare.net/git/${config.namespace}/${projectId}.git`,
    head: async () => sha, mainHead: async () => older,
    gitToken: async () => ({ id: 'git-id', token: 'private-git', username: 'x-token-auth', expiresAt: '2030-01-01' }),
    revoke: async (_state, id) => operations.push(['revoke', id]),
    request: async path => ({ hash: path.split('/').at(-1), parents: path.endsWith(sha) ? [older] : [] }),
    artifact: path => '/artifacts/' + path, repo: () => projectId,
  };
  const controller = new ProjectController(state, { config, provider, checkpoint: async value => writes.push(structuredClone(value)), enqueue: async () => operations.push(['enqueue']) });
  await controller.prepare({ id: projectId, owner: { id: 'owner-subject', email: 'owner@example.com' }, source: { repo: 'owner/source', commit: sha } });
  const handoff = await controller.access({ subject: 'owner-subject', email: 'owner@example.com', role: 'owner', vmId: 'vm-owner' });
  const owner = await controller.actor(handoff.token);
  state.setup = 'ready';
  return { state, controller, provider, owner, handoff, writes, operations };
}
export async function passing(f) {
  await f.controller.candidate({ sha, ref });
  await f.controller.start(sha, ref, 'workflow-id');
  const candidate = f.controller.getCandidate(sha, ref);
  candidate.bundleDigest = 'd'.repeat(64); candidate.uploadKey = `${projectId}/bundles/${sha}/${candidate.bundleDigest}`;
  await f.controller.passed(sha, ref, { sha, projectId, digest: candidate.bundleDigest, exitCode: 0, version: versionId, url: 'https://private-preview.workers.dev' });
  return candidate;
}
export async function bundle() {
  const record = async (name, text, type) => ({ name, content: to64(new TextEncoder().encode(text)), digest: await digest(text), type });
  const asset = await record('index.html', '<html>Real Vite site</html>', 'text/html');
  return { format: 1, sha, projectId, main: 'index.js', modules: [await record('index.js', 'export default {fetch(){return new Response("site")}}', 'application/javascript+module')], assets: [{ ...asset, path: '/index.html', name: undefined }], migrations: [await record('0001.sql', 'CREATE TABLE widgets(id TEXT PRIMARY KEY);', 'text/plain')] };
}
