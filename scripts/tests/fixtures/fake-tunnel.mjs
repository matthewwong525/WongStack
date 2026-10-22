// Stand-ins shared by the private-link tests. `fakeTunnel` writes a logging `cloudflared` that prints cloudflared
// 2026.9.3's quick-tunnel lines; TUNNEL_ENV keeps the address check on loopback; `fakePaseo` logs each call to `sent`.

import { chmodSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';

export const ORIGIN = 'https://quiet-fox-lamp.trycloudflare.com';
export const TUNNEL_ENV = { HANDOVER_PROBE_ORIGIN: 'http://127.0.0.1:{port}' };

/** `pidFile` receives the tunnel's pid; `silent` makes a tunnel that starts and never registers. */
export function fakeTunnel(bin, calls, { pidFile = '/dev/null', silent = false } = {}) {
  const registers = `echo "2026-09-28T04:50:20Z INF Requesting new quick Tunnel on trycloudflare.com..." >&2
echo "2026-09-28T04:50:25Z INF |  ${ORIGIN}                             |" >&2
echo "2026-09-28T04:50:26Z INF Registered tunnel connection connIndex=0 location=hel02 protocol=quic" >&2`;
  writeFileSync(join(bin, 'cloudflared'), `#!/bin/sh
echo "cloudflared $*" >> "${calls}"
[ "$1" = "--version" ] && exit 0
echo $$ > "${pidFile}"
${silent ? '' : registers}
exec sleep 600
`);
  chmodSync(join(bin, 'cloudflared'), 0o755);
}

/** `envs`, when given, receives the env of each call. */
export function fakePaseo(bin, sent, kind = 'ok', envs = null) {
  writeFileSync(join(bin, 'paseo'), `#!${process.execPath}
const fs = require('node:fs');
fs.appendFileSync(${JSON.stringify(sent)}, JSON.stringify(process.argv.slice(2)) + '\\n');
${envs ? `fs.appendFileSync(${JSON.stringify(envs)}, JSON.stringify(process.env) + '\\n');` : ''}
${kind === 'fail' ? 'process.exit(1);' : kind === 'invalid' ? "console.log('{}');" : "console.log(JSON.stringify({agentId: process.argv[3], status: 'sent'}));"}
`);
  chmodSync(join(bin, 'paseo'), 0o755);
}
