import { need, projectAllowed, shaOK, uuidOK } from './security.mjs';

// Preserve the SDK's event/tree/reporting adapter, replacing all credential issuance.
export function trackedSourceAdapter(adapter) {
  return { ...adapter, create(env) {
    const provider = adapter.create(env);
    provider.getSourceCheckout = async source => {
      const config = JSON.parse(env.HOSTED_CONFIG);
      need(source.owner === config.namespace && source.providerData?.namespace === config.namespace && uuidOK(source.repo) && projectAllowed(config, source.repo) && shaOK(source.sha), 'Tracked checkout source mismatch');
      const stub = env.PROJECTS.get(env.PROJECTS.idFromName(source.repo));
      const response = await stub.fetch(new Request('https://project/internal/git-checkout', { method: 'POST', body: JSON.stringify({ sha: source.sha }) }));
      need(response.ok, 'Tracked checkout unavailable');
      const row = await response.json();
      const remote = `https://${config.account}.artifacts.cloudflare.net/git/${config.namespace}/${source.repo}.git`;
      need(row.remote === remote && row.sha === source.sha && typeof row.token === 'string', 'Tracked checkout receipt differs');
      need(row.snapshotOnly === true ? row.token === '' : row.snapshotOnly === false && row.token.length > 0, 'Tracked checkout phase differs');
      // The SDK overlays source even after restoring a chained snapshot. Fetch from
      // that exact local Git snapshot; an absent restore fails without issuing a token.
      return { kind: 'git', remote: row.snapshotOnly ? 'file:///workspace' : remote, sha: source.sha, token: row.token };
    };
    provider.getStepCredentialEnv = async () => { throw new Error('Candidate source credentials are unavailable'); };
    provider.getPushCredentials = async () => { throw new Error('Candidate push credentials are unavailable'); };
    return provider;
  } };
}
