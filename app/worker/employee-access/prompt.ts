// Only reviewed immutable public Source bytes belong in a copied setup prompt.
import release from './bootstrap-release.json' with { type: 'json' };
export function setupPrompt(origin: string, artifact = release) {
  const target = new URL(origin);
  if (target.protocol !== 'https:' || target.origin !== origin ||
    artifact.version !== 1 || !/^[a-f0-9]{40}$/.test(artifact.commit) || !/^[a-f0-9]{64}$/.test(artifact.sha256)) {
    return { state: 'unavailable' as const, message: 'Ask your employer to finish the reviewed assistant setup.' };
  }
  const url = `https://raw.githubusercontent.com/matthewwong525/WongStack/${artifact.commit}/scripts/employee-bootstrap.mjs`;
  return { state: 'ready' as const, text: `Connect my assistant to the company API at ${origin} using my own business app login.
Use the reviewed standalone Node bootstrap at ${url} (SHA-256 ${artifact.sha256}).
Download without credentials and refuse redirects. Verify the complete SHA-256 digest before execution. Save it as bootstrap.mjs in an OS-user-private directory outside every checkout (directory 0700, file 0600); preserve all existing files and memory settings.
Run node <private-directory>/bootstrap.mjs login --state <private-directory> --origin ${origin}, then status with the same --state. Install Node/cloudflared from their official distributions if needed. Let me approve this same business login on this computer; only show its validated login link when a browser is unavailable. Never print credentials, raw login output or place tokens in arguments, URLs or tracked files.
Confirm authenticated API status and my currently allowed apps. Discover only actions needed for my work using list, describe and call with the same --state. Use my existing separate memory access only if already installed. Repository access and authentication are manual through its provider; app login grants none. Report unavailable access honestly and never substitute employer, deployment, verification or memory credentials.` };
}
