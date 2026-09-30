#!/usr/bin/env node
// Reuse ignored machine credentials; report statuses, never response bodies or credential values.
import { existsSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { isMain, parseCli, usageError } from './lib-cli.mjs';
import { primaryRoot } from '../.claude/skills/memory/scripts/lib/primary-root.mjs';
import { parseEnv } from '../.claude/skills/memory/scripts/lib/store.mjs';

export async function probePrivateAccess(url, credentials, fetchFn = fetch) {
  const target = new URL(url);
  if (target.protocol !== 'https:' || target.username || target.password || target.search || target.hash) throw new Error('verification needs a plain HTTPS app URL');
  if (!credentials.CF_ACCESS_CLIENT_ID || !credentials.CF_ACCESS_CLIENT_SECRET) throw new Error('saved verification credentials are missing; run private setup again');
  const request = headers => fetchFn(target, { redirect: 'manual', headers });
  const anonymous = await request({});
  const machine = await request({ 'CF-Access-Client-Id': credentials.CF_ACCESS_CLIENT_ID, 'CF-Access-Client-Secret': credentials.CF_ACCESS_CLIENT_SECRET });
  const redirect = anonymous.headers.get('location');
  const challenged = anonymous.status === 302 && redirect && new URL(redirect, target).hostname.endsWith('.cloudflareaccess.com');
  const denied = challenged || [401, 403].includes(anonymous.status);
  return {
    url: target.toString(), anonymousStatus: anonymous.status, machineStatus: machine.status,
    closed: Boolean(denied), machineVerified: machine.status >= 200 && machine.status < 300,
    humanLogin: 'unverified',
  };
}

if (isMain(import.meta.url)) {
  const usage = 'usage: node scripts/probe-private-access.mjs --url <https://app/path>';
  const { values } = parseCli({ usage, options: { url: { type: 'string' } } });
  if (!values.url) usageError(usage, '--url is required');
  try {
    const file = join(primaryRoot(process.cwd()).primary, '.env');
    const credentials = existsSync(file) ? parseEnv(readFileSync(file, 'utf8')) : {};
    const report = await probePrivateAccess(values.url, credentials);
    console.log(JSON.stringify(report));
    process.exitCode = report.closed && report.machineVerified ? 0 : 1;
  } catch {
    console.error('private verification failed; check the plain HTTPS URL, saved credentials, and Access configuration');
    process.exitCode = 1;
  }
}
