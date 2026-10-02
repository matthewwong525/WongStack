#!/usr/bin/env node
import { readFileSync, readdirSync, writeFileSync } from 'node:fs';
import { pathToFileURL } from 'node:url';
import { resolve } from 'node:path';
import { parseArgs } from 'node:util';
import { createManifest, inventory, writePrivate, readManifest, ensureResource, cleanup, assertAccount } from './lifecycle.mjs';
import { CloudflareProvider, credentialsFile } from './provider.mjs';
import { controllerConfig } from './config.mjs';
import { signSession } from './core.mjs';
import { exportRepository, redact } from './evidence.mjs';
import { managedOperation } from './managed-lifecycle.mjs';

export async function main(args) {
  const parsed = parseArgs({ args, allowPositionals: true, options: Object.fromEntries(['account', 'run', 'backend', 'manifest', 'credentials', 'admin-credentials', 'owner', 'owner-email', 'out', 'session', 'subject', 'controller', 'body', 'remote', 'mirror', 'destination'].map(key => [key, { type: 'string' }])) });
  const [operation, action] = parsed.positionals;
  const opts = parsed.values;
  if (operation === 'init') {
    const manifest = createManifest(opts.account, opts.run, opts.backend);
    writePrivate(opts.manifest, manifest);
    return { manifest: opts.manifest, inventory: inventory(manifest), bounds: manifest.bounds };
  }
  const manifest = readManifest(opts.manifest);
  assertAccount(manifest, opts.account);
  const save = value => writePrivate(opts.manifest, value);
  if (operation === 'inventory') return { account: manifest.account, resources: inventory(manifest), bounds: manifest.bounds };
  if (operation === 'config') { const config = controllerConfig(manifest, opts.owner, opts['owner-email']); writePrivate(opts.out, config); return { config: opts.out, eventFilter: config.triggers.events[0].filter }; }
  if (operation === 'session') {
    const signing = JSON.parse(readFileSync(opts.session, 'utf8'));
    const token = await signSession(signing.secret, { run: manifest.run, project: `${manifest.prefix}-project`, sub: opts.subject, aud: 'artifacts-pilot', epoch: signing.epoch || 0, exp: Date.now() + 1800000 });
    writePrivate(opts.out, { session: token }); return { sessionFile: opts.out, expiresInSeconds: 1800, simulatedIdentity: true };
  }
  if (operation === 'call') {
    if (!['state', 'member', 'git-token', 'remove', 'stop', 'approve', 'publish', 'drain-buckets', '_memory/join'].includes(action)) throw new Error('Explicit pilot operation required');
    const url = new URL(opts.controller);
    if (url.protocol !== 'https:' || !url.hostname.startsWith(`${manifest.prefix}-controller.`) || !url.hostname.endsWith('.workers.dev') || url.username || url.password || url.search || url.hash) throw new Error('Manifest-owned controller URL required');
    const session = JSON.parse(readFileSync(opts.session, 'utf8')).session;
    const input = opts.body ? readFileSync(opts.body, 'utf8') : '{}';
    const response = await fetch(`${url.origin}/${action}`, { method: action === 'state' ? 'GET' : 'POST', headers: { 'X-Pilot-Session': session, 'Content-Type': 'application/json' }, ...(action !== 'state' ? { body: input } : {}), redirect: 'error' });
    const result = await response.json();
    if (!response.ok) throw new Error(result.error || `Controller HTTP ${response.status}`);
    if (['git-token', '_memory/join'].includes(action)) { writePrivate(opts.out, result); return { credentialFile: opts.out }; }
    return result;
  }
  if (operation === 'export') return exportRepository(opts.remote, opts.mirror, opts.destination);
  const credentials = credentialsFile(opts.credentials);
  if (opts['admin-credentials']) credentials.adminToken = credentialsFile(opts['admin-credentials']).token;
  const provider = new CloudflareProvider(opts.account, credentials, manifest.namespace);
  if (operation === 'managed') return managedOperation(action, manifest, opts.account, provider, save, opts.body ? JSON.parse(readFileSync(opts.body, 'utf8')) : {});
  if (operation === 'preflight') return provider.preflight();
  if (operation === 'provision') {
    for (const spec of inventory(manifest).filter(row => ['namespace', 'repo', 'd1', 'r2', 'worker'].includes(row.kind))) {
      await ensureResource(manifest, opts.account, spec, provider, save);
      // Creation grants an initial Git key. Track its ID and revoke it before handing out scoped keys.
      for (const credential of manifest.credentials.filter(row => row.initial && !row.revoked)) {
        await provider.revoke(credential); credential.revoked = true; await save(manifest);
      }
    }
    return { resources: manifest.resources, operations: provider.operations };
  }
  if (operation === 'seed') {
    for (const env of ['staging', 'production']) {
      const db = manifest.resources.find(row => row.kind === 'd1' && row.name.endsWith(`-${env}`));
      if (!db?.id || db.status !== 'created') throw new Error('Manifest-owned environment database required');
      await provider.seed(db.id, `CREATE TABLE IF NOT EXISTS canary(id INTEGER PRIMARY KEY,value TEXT NOT NULL); INSERT OR IGNORE INTO canary VALUES(1,'${env}-only');`);
    }
    const db = manifest.resources.find(row => row.kind === 'd1' && row.name.endsWith('-memory'));
    if (!db?.id || manifest.memorySeeded) throw new Error('Fresh manifest-owned memory DB required; schema seed is not repeatable');
    const folder = new URL('../../../.agents/skills/memory/migrations/', import.meta.url);
    for (const file of readdirSync(folder).filter(name => name.endsWith('.sql')).sort()) await provider.seed(db.id, readFileSync(new URL(file, folder), 'utf8'));
    manifest.memorySeeded = true; await save(manifest);
    return { seeded: ['staging', 'production', 'real shared memory schema'] };
  }
  if (operation === 'receipts') {
    // Readbacks alone cannot establish ownership: explicit deployment acknowledgement is mandatory.
    const receipt = JSON.parse(readFileSync(opts.body, 'utf8'));
    if (receipt.run !== manifest.run || receipt.account !== manifest.account || !receipt.deployedAt) throw new Error('Account/run-scoped successful controller deployment receipt required');
    for (const spec of inventory(manifest).filter(row => ['workflow', 'container', 'durable-object'].includes(row.kind))) {
      const found = await provider.find(spec);
      if (!found?.id) throw new Error(`No provider resource receipt: ${spec.name}`);
      const existing = manifest.resources.find(row => row.kind === spec.kind && row.name === spec.name);
      if (!existing) throw new Error('Pipeline resource must have an absent-before-deploy reservation');
      Object.assign(existing, { id: found.id, status: 'created', acknowledgedAt: receipt.deployedAt });
      await save(manifest);
    }
    return { recorded: manifest.resources.filter(row => ['workflow', 'container', 'durable-object'].includes(row.kind)) };
  }
  if (operation === 'reserve-pipeline') {
    for (const spec of inventory(manifest).filter(row => ['workflow', 'container', 'durable-object'].includes(row.kind))) {
      if (manifest.resources.some(row => row.kind === spec.kind && row.name === spec.name)) throw new Error('Already reserved; reconcile interrupted deployment');
      if (await provider.find(spec)) throw new Error('Pre-existing pipeline resource rejected');
      manifest.resources.push({ ...spec, createdBy: manifest.run, status: 'creating' }); await save(manifest);
    }
    return { reserved: true };
  }
  if (operation === 'cleanup') return cleanup(manifest, opts.account, provider, save);
  if (operation === 'redact') {
    const raw = readFileSync(opts.body, 'utf8');
    writeFileSync(opts.out, redact(raw, [credentials.token])); return { evidence: opts.out };
  }
  throw new Error('Operation required: init, inventory, preflight, provision, seed, config, reserve-pipeline, receipts, session, call, export, cleanup, redact');
}

if (process.argv[1] && import.meta.url === pathToFileURL(resolve(process.argv[1])).href) main(process.argv.slice(2)).then(result => console.log(JSON.stringify(result, null, 2))).catch(error => { console.error(error.message); process.exitCode = 1; });
