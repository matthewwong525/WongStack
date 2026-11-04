#!/usr/bin/env node
// Git's credential helper for the app's Git addresses: answers `get` with the saved person's company sign-in, never
// signing in or storing. wiki/stack/employee-project.md
import { readFileSync } from 'node:fs';
import { join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { cloudflared, companyOrigin, employeeToken, installState } from './employee-bootstrap.mjs';

const fields = text => Object.fromEntries(text.split('\n').filter(line => line.includes('=')).map(line => [line.slice(0, line.indexOf('=')), line.slice(line.indexOf('=') + 1)]));

// With no saved person (the owner's computer), company knowledge takes any sign-in: the app checks each call.
function savedPerson(state, path = '') {
  try {
    return JSON.parse(readFileSync(join(state, 'target.json'), 'utf8')).identity;
  } catch (error) {
    if (error.code === 'ENOENT' && /^api\/access\/knowledge\/git(\/|$)/.test(path)) return null;
    throw error;
  }
}

/** The lines to give git for one `get`, or nothing when there is no valid sign-in for the saved person. */
export async function credential(input, { run = cloudflared, stateOf = installState } = {}) {
  const asked = fields(input);
  try {
    const origin = companyOrigin(`${asked.protocol}://${asked.host}`);
    const identity = savedPerson(stateOf(origin), asked.path);
    const token = employeeToken(await run(['token', `-app=${origin}`], { timeoutMs: 20000 }));
    const claims = JSON.parse(Buffer.from(token.split('.')[1], 'base64url').toString('utf8'));
    const other = identity && (claims.email.trim().toLowerCase() !== identity.email.trim().toLowerCase() || claims.sub !== identity.subject);
    if (other) return '';
    return `username=x-access\npassword=${token}\n`;
  } catch {
    return '';
  }
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url) && process.argv[2] === 'get') {
  let input = '';
  for await (const chunk of process.stdin) input += chunk;
  process.stdout.write(await credential(input));
}
