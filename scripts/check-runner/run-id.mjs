// The name of one check run: its commit and its branch. The runner starts the run under this name
// and the verbs read it back by the same name, so a result always belongs to one exact commit.
// Runs in the Worker and on the person's computer: Web Crypto only.
const SHA = /^[0-9a-f]{40}$/;
const BRANCH_REF = /^refs\/heads\/.+/;

export async function runId(sha, ref) {
  if (!SHA.test(String(sha)) || !BRANCH_REF.test(String(ref))) throw new Error('a check run needs a full commit id and a branch ref');
  const digest = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(ref));
  const hex = [...new Uint8Array(digest)].map((byte) => byte.toString(16).padStart(2, '0')).join('');
  return `wong-${sha}-${hex.slice(0, 12)}`;
}
