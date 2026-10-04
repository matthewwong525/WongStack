#!/usr/bin/env node
// Consume private operator pins through the verified owner's app session.
import { companyClient } from './company-api.mjs';
import { isMain, parseCli } from './lib-cli.mjs';
export async function ownerSetup(client, action) {
  const identity = await client.ownerSetup('identity');
  if (!identity.subject || !identity.email || !identity.origin) throw new Error('Verified owner identity unavailable');
  // The server compares this current identity with independent private operator
  // pins. This command never derives an owner from a visitor or public marker.
  return action === 'identity' ? identity : client.ownerSetup(action);
}
const usage = 'usage: employee-owner-setup.mjs identity|activate|connect|prepare|rollout|editing|check|status|retry';
if (isMain(import.meta.url)) {
  const { positionals: [action, ...extra] } = parseCli({ usage, allowPositionals: true });
  try {
    if (extra.length) throw new Error(usage);
    const result = await ownerSetup(companyClient({ onLoginUrl: link => console.error(`Approve your existing business app login: ${link}`) }), action);
    console.log(JSON.stringify(result, null, 2));
  } catch { console.error('Owner setup did not complete. Check the private owner record and use your own business app login.'); process.exitCode = 1; }
}
