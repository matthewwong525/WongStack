// Read-only deployment contract; configuration alone is not proof of a real email login.
export function privateDeployment(config, environment = 'production') {
  if (!['production', 'staging'].includes(environment)) throw new Error('only protected production or staging may deploy');
  const selected = environment === 'staging' && config.env?.staging ? config.env.staging : config;
  const vars = selected.vars ?? {};
  const assets = selected.assets ?? config.assets;
  if (assets?.run_worker_first !== true) throw new Error('every asset must run through the authentication Worker before deployment');
  if ('SKIP_AUTH' in vars || vars.WONG_ENVIRONMENT !== environment) throw new Error('local authentication substitution cannot deploy');
  if (!/^[a-z0-9-]+\.cloudflareaccess\.com$/i.test(vars.CF_ACCESS_TEAM_DOMAIN ?? '') || !vars.CF_ACCESS_AUD || !vars.CF_ACCESS_APP_ID || !/^[a-f0-9]{32}$/i.test(vars.CF_ACCESS_WORKER_ID ?? '')) {
    throw new Error('private Access identifiers are incomplete; finish setup or the reviewed privacy migration');
  }
  if (environment === 'staging' && [...(selected.d1_databases ?? []), ...(selected.r2_buckets ?? [])].some(binding => binding.binding?.startsWith('MEMORY_'))) {
    throw new Error('staging and previews must not bind production memory');
  }
  return {
    name: selected.name ?? config.name, appId: vars.CF_ACCESS_APP_ID, audience: vars.CF_ACCESS_AUD,
    teamDomain: vars.CF_ACCESS_TEAM_DOMAIN, workerId: vars.CF_ACCESS_WORKER_ID, environment,
  };
}

const escapePattern = value => value.replace(/[.+?^${}()|[\]\\]/g, '\\$&').replaceAll('*', '.*');
const hostMatches = (pattern, host) => new RegExp(`^${escapePattern(pattern)}$`, 'i').test(host);

/** Any overlapping higher-precedence app needs review, regardless of its policy's current decision. */
export function accessConflicts(apps, workers, subdomain, ownedId) {
  const hosts = workers.flatMap(worker => [
    `${worker.name}.${subdomain}.workers.dev`,
    ...(worker.references?.domains ?? []).map(domain => domain.hostname),
    ...(worker.routes ?? []).map(route => route.pattern.replace(/^https?:\/\//, '').split('/')[0]),
  ]);
  return apps.filter(app => app.id !== ownedId && [
    ...(app.destinations ?? []), ...(app.domain ? [{ type: 'public', uri: app.domain }] : []),
  ].some(destination => {
    if (['worker', 'preview_worker'].includes(destination.type)) return workers.some(worker => worker.id === destination.worker_id);
    if (destination.type !== 'public') return false;
    const host = String(destination.uri ?? '').replace(/^https?:\/\//, '').split('/')[0];
    if (!host) return false;
    return hosts.some(known => hostMatches(host, known) || hostMatches(known, host)) || workers.some(worker => {
      const defaultHost = `${worker.name}.${subdomain}.workers.dev`;
      return host.endsWith(`-${defaultHost}`) || hostMatches(host, `test-${defaultHost}`);
    });
  }));
}
