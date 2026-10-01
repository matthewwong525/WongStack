import { execFileSync } from 'node:child_process';
import { existsSync } from 'node:fs';

export function redact(value, secrets = []) {
  let text = typeof value === 'string' ? value : JSON.stringify(value);
  for (const secret of secrets.filter(Boolean).sort((a, b) => b.length - a.length)) text = text.replaceAll(secret, '[REDACTED]');
  text = text.replace(/Bearer\s+[^\s"]+/gi, 'Bearer [REDACTED]').replace(/(?:wongm_|art_v1_)[^\s"<>]+/g, '[REDACTED]').replace(/https:\/\/[^\s/@]+:[^\s/@]+@/g, 'https://[REDACTED]@');
  text = text.replace(/("(?:token|plaintext|secret|session|CF_TOKEN|SESSION_SECRET|R2_ACCESS_KEY_ID|R2_SECRET_ACCESS_KEY)"\s*:\s*")[^"]*(")/g, '$1[REDACTED]$2').replace(/((?:X-Pilot-Session|CF_TOKEN|SESSION_SECRET|R2_ACCESS_KEY_ID|R2_SECRET_ACCESS_KEY)\s*[:=]\s*)[^\s\n]+/gi, '$1[REDACTED]');
  return text;
}
export function caseEvidence(name, outcome, observation, extra = {}) {
  if (!['PASS', 'FAIL', 'UNKNOWN'].includes(outcome)) throw new Error('Explicit PASS, FAIL, or UNKNOWN required');
  if (outcome === 'PASS' && (!extra.live || !extra.providerEvidence)) throw new Error('PASS requires live provider evidence');
  return { ...extra, name, outcome, at: new Date().toISOString(), observation };
}
export function adoption(cases, cleanupStatus, coreCases) {
  return cleanupStatus === 'verified' && coreCases.length > 0 && coreCases.every(name => {
    const latest = cases.findLast(row => row.name === name);
    return latest?.outcome === 'PASS' && latest.live && latest.providerEvidence;
  }) ? 'Consider new hosted projects; complete hosted integrations separately.' : 'Defer adoption: core live evidence or verified cleanup is missing.';
}
export function compareRefs(expected, actual) {
  const parse = text => text.trim().split('\n').filter(Boolean).sort().join('\n');
  if (!expected.trim() || parse(expected) !== parse(actual)) throw new Error('Export lost or changed a branch/tag/object ID');
}
const git = (args, cwd, env) => execFileSync('git', args, { cwd, env: { ...process.env, GIT_TERMINAL_PROMPT: '0', ...env }, encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'] });
export function exportRepository(remote, mirror, destination, env = {}) {
  if (existsSync(mirror) || existsSync(destination)) throw new Error('Export requires clean independent destinations');
  const url = new URL(remote);
  if (url.protocol !== 'https:' || url.username || url.password || url.search) throw new Error('Export remote must contain no credentials');
  const expected = git(['ls-remote', '--refs', remote], undefined, env);
  git(['clone', '--mirror', remote, mirror], undefined, env);
  git(['init', '--bare', destination]);
  git(['-C', mirror, 'push', '--mirror', destination], undefined, env);
  const actual = git(['ls-remote', '--refs', destination]);
  compareRefs(expected, actual);
  const fsck = git(['-C', destination, 'fsck', '--full']);
  return { refs: actual.trim().split('\n'), fsck, destination, outcome: 'PASS', tested: 'Independent local bare Git restore; no GitHub destination tested' };
}
