// A stand-in for Cloudflare's tunnel tool, shared by the private-link tests. `fakeTunnel(bin, calls)`
// writes a `cloudflared` into `bin` that logs each call to `calls`, prints the lines cloudflared
// 2026.9.3 prints for a quick tunnel at ORIGIN, and sleeps until it is killed. TUNNEL_ENV points the
// link's public-address check at the page's own loopback port, so no test needs the network.

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
