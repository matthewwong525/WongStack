import { assertAccount, inventory } from './lifecycle.mjs';
import { managedTrigger, validateTrigger } from './builds.mjs';

const need = (condition, message) => { if (!condition) throw new Error(message); };
const terminal = row => row.status === 'stopped' && ['success', 'fail', 'skipped', 'cancelled', 'terminated'].includes(row.build_outcome);
export function setupConfig(manifest) {
  const row = (kind, suffix) => {
    const found = manifest.resources.find(each => each.kind === kind && each.name === `${manifest.prefix}-${suffix}`);
    need(found?.id && found.createdBy === manifest.run && found.status === 'created', `Acknowledged ${suffix} resource required`);
    return found;
  };
  const connection = row('build-connection', 'connection'), staging = row('worker', 'staging');
  const trigger = manifest.resources.find(each => each.kind === 'build-trigger');
  need(trigger?.createdBy === manifest.run, 'Reserved managed trigger required');
  return { backend: 'workers-builds', account: manifest.account, run: manifest.run, repo: row('repo', 'project').name, staging: staging.name, production: row('worker', 'production').name, stagingDB: row('d1', 'staging').id, productionDB: row('d1', 'production').id, builds: { connection: connection.id, trigger: trigger.id || 'pending', workerTag: connection.workerTag, repoID: row('repo', 'project').id } };
}
export async function managedOperation(action, manifest, account, provider, save, input = {}) {
  assertAccount(manifest, account);
  need(manifest.backend === 'workers-builds', 'Opt-in workers-builds manifest required');
  const path = suffix => provider.path(`builds/${suffix}`);
  if (action === 'reserve') {
    const worker = manifest.resources.find(row => row.kind === 'worker' && row.name.endsWith('-staging') && row.status === 'created' && row.createdBy === manifest.run);
    const repo = manifest.resources.find(row => row.kind === 'repo' && row.name.endsWith('-project') && row.status === 'created' && row.createdBy === manifest.run);
    need(worker && repo, 'Fresh acknowledged project and staging Worker required');
    const scripts = await provider.request(provider.path('workers/scripts'));
    const tag = scripts.find(row => row.id === worker.name)?.tag;
    need(tag, 'Staging Worker tag not observed');
    need((await provider.request(path(`workers/${encodeURIComponent(tag)}/triggers`))).length === 0, 'Pre-existing staging build triggers rejected');
    for (const spec of inventory(manifest).filter(row => row.kind.startsWith('build-'))) {
      need(!manifest.resources.some(row => row.kind === spec.kind), 'Interrupted managed setup requires reconciliation');
      manifest.resources.push({ ...spec, createdBy: manifest.run, status: 'creating', workerTag: tag, freshRepository: true, reservedAt: new Date().toISOString() });
      await save(manifest);
    }
    return { reserved: true, workerTag: tag, repoID: repo.id };
  }
  if (action === 'connection' || action === 'connection-receipt') {
    const reserved = manifest.resources.find(row => row.kind === 'build-connection');
    const repo = manifest.resources.find(row => row.kind === 'repo' && row.name.endsWith('-project'));
    need(reserved?.status === 'creating' && reserved.createdBy === manifest.run && repo?.status === 'created', 'Fresh managed connection reservation required');
    // Artifacts' REST provider enum may lag dashboard support. Never substitute another SCM.
    need(input.provider_type === 'artifacts' && String(input.repo_id) === String(repo.id) && input.repo_name === repo.name && input.provider_account_name === manifest.namespace, 'Connection must identify the exact disposable Artifacts repository');
    const receipt = action === 'connection' ? await provider.request(path('repos/connections'), 'PUT', input) : input;
    need(receipt.repo_connection_uuid && receipt.provider_type === 'artifacts' && String(receipt.repo_id) === String(repo.id) && receipt.repo_name === repo.name && receipt.provider_account_name === manifest.namespace && receipt.created_on, 'Unreadable Artifacts connection acknowledgment');
    need(Date.parse(receipt.created_on) >= Math.floor(Date.parse(reserved.reservedAt) / 1000) * 1000, 'Connection receipt predates ownership reservation');
    Object.assign(reserved, { id: receipt.repo_connection_uuid, status: 'created', acknowledgedAt: new Date().toISOString(), providerType: receipt.provider_type });
    await save(manifest); return { connection: reserved.id };
  }
  if (action === 'token') {
    const management = manifest.credentials.filter(row => row.kind === 'management').map(row => row.id);
    need(input.id && input.token && input.expiresAt && Date.parse(input.expiresAt) > Date.now() && Date.parse(input.expiresAt) < Date.now() + 86400000 && !management.includes(input.id) && input.token !== provider.credentials.token && input.token !== provider.credentials.buildsApiToken && input.token !== provider.credentials.adminToken, 'Fresh expiring deployment token required; administration tokens forbidden');
    need(!manifest.credentials.some(row => row.kind === 'build-registration'), 'Interrupted token registration needs reconciliation');
    if (!manifest.credentials.some(row => row.kind === 'build-deployment' && row.id === input.id)) manifest.credentials.push({ kind: 'build-deployment', id: input.id, issuer: 'user', expiresAt: input.expiresAt, createdBy: manifest.run, revoked: false });
    const tracked = { kind: 'build-registration', status: 'creating', createdBy: manifest.run, revoked: false };
    manifest.credentials.push(tracked); await save(manifest);
    const result = await provider.request(path('tokens'), 'POST', { build_token_name: `${manifest.prefix}-build`, build_token_secret: input.token, cloudflare_token_id: input.id });
    need(result?.build_token_uuid && result.cloudflare_token_id === input.id, 'Build token registration acknowledgment mismatch');
    Object.assign(tracked, { id: result.build_token_uuid, tokenID: input.id, expiresAt: input.expiresAt, status: 'created' });
    await save(manifest); return { registration: tracked.id };
  }
  if (action === 'trigger') {
    const reserved = manifest.resources.find(row => row.kind === 'build-trigger');
    const token = manifest.credentials.find(row => row.kind === 'build-registration' && row.status === 'created' && !row.revoked);
    need(reserved?.status === 'creating' && token, 'Fresh trigger reservation and registered build token required');
    const config = setupConfig(manifest);
    const receipt = await provider.request(path('triggers'), 'POST', managedTrigger(config, token.id));
    need(receipt?.trigger_uuid, 'Trigger creation returned no receipt');
    // Persist acknowledged ID before readback or validation so failures remain cleanable.
    Object.assign(reserved, { id: receipt.trigger_uuid, status: 'created', acknowledgedAt: new Date().toISOString() });
    await save(manifest);
    config.builds.trigger = reserved.id;
    const triggers = await provider.request(path(`workers/${encodeURIComponent(reserved.workerTag)}/triggers`));
    need(triggers.length === 1, 'Unexpected build triggers');
    validateTrigger(triggers[0], config);
    return { trigger: reserved.id, manualOnly: true };
  }
  if (action === 'quiesce') {
    need(manifest.quiesced?.controllerStopped && manifest.quiesced?.triggersDisabled && manifest.quiesced?.instancesStopped, 'Stop CI and its event subscription before managed teardown');
    const trigger = manifest.resources.find(row => row.kind === 'build-trigger');
    need(trigger?.workerTag, 'Manifest-owned staging Worker tag required');
    let count = 0;
    for (let page = 1; page <= 100; page++) {
      const result = await provider.request(path(`workers/${encodeURIComponent(trigger.workerTag)}/builds?page=${page}&per_page=100`));
      need(Array.isArray(result), 'Unreadable managed build list');
      for (const row of result) {
        need(row.trigger?.trigger_uuid === trigger.id, 'Unowned managed build cannot be cancelled');
        if (!terminal(row)) await provider.request(path(`builds/${encodeURIComponent(row.build_uuid)}/cancel`), 'PUT');
        const final = await provider.request(path(`builds/${encodeURIComponent(row.build_uuid)}`));
        need(final.build_uuid === row.build_uuid && terminal(final), 'Managed build is not observably stopped');
        count++;
      }
      if (result.length < 100) {
        manifest.quiesced.buildsStopped = true; manifest.quiesced.managedBuildCount = count; await save(manifest);
        return { stopped: count };
      }
    }
    throw new Error('Managed build list bound reached');
  }
  throw new Error('Managed operation required: reserve, connection, connection-receipt, token, trigger, quiesce');
}
