#!/usr/bin/env node
// Git's credential helper in a copy installed through the app: answers `get` with the saved company sign-in of the
// person who set it up. It never signs in and never stores. wiki/stack/employee-project.md
import { readFileSync } from 'node:fs';
import { join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { cloudflared, companyOrigin, employeeToken, installState } from './employee-bootstrap.mjs';

const fields = text => Object.fromEntries(text.split('\n').filter(line => line.includes('=')).map(line => [line.slice(0, line.indexOf('=')), line.slice(line.indexOf('=') + 1)]));

/** The lines to give git for one `get`, or nothing when there is no valid sign-in for the saved person. */
export async function credential(input, { run = cloudflared, stateOf = installState } = {}) {
  const asked = fields(input);
  try {
    const origin = companyOrigin(`${asked.protocol}://${asked.host}`);
    const { identity } = JSON.parse(readFileSync(join(stateOf(origin), 'target.json'), 'utf8'));
    const token = employeeToken(await run(['token', `-app=${origin}`], { timeoutMs: 20000 }));
    const claims = JSON.parse(Buffer.from(token.split('.')[1], 'base64url').toString('utf8'));
    if (claims.email.trim().toLowerCase() !== identity.email.trim().toLowerCase() || claims.sub !== identity.subject) return '';
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
