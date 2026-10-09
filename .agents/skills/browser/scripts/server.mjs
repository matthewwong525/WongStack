#!/usr/bin/env node
// Browser and local forwarder share one process. No direct-browser fallback or browsing logs.
import { pathToFileURL } from 'node:url';
import { startForwarder } from './forwarder.mjs';
import { isMain } from '../../memory/scripts/lib/cli.mjs';

/** Clear native external endpoints, credentials, and routing before configuring the owned listener. */
export function localProxyEnv(port, env = process.env) {
  const clean = Object.fromEntries(Object.entries(env).filter(([name]) => !name.startsWith('PROXY_')));
  return { ...clean, PROXY_HOST: '127.0.0.1', PROXY_PORT: String(port), PROXY_PROTOCOL: 'http', PROXY_STRATEGY: 'round_robin' };
}

async function launch(serverScript) {
  const proxy = await startForwarder();
  for (const name of Object.keys(process.env)) if (name.startsWith('PROXY_')) delete process.env[name];
  Object.assign(process.env, localProxyEnv(proxy.port));
  // Camofox owns graceful browser shutdown and login persistence; close our listener alongside it.
  const closing = () => { void proxy.close(); };
  process.on('SIGTERM', closing);
  process.on('SIGINT', closing);
  try {
    await import(pathToFileURL(serverScript).href);
  } catch {
    await proxy.close();
    process.exit(1);
  }
}

if (isMain(import.meta.url)) {
  launch(process.argv[2]).catch(() => process.exit(1));
}
