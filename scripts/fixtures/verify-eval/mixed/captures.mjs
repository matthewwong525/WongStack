import { createHash } from 'node:crypto';
import { spawnSync } from 'node:child_process';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';

export const PRACTICE_SHA = 'a'.repeat(40);
const sha256 = value => createHash('sha256').update(value).digest('hex');

// Run the disposable command, then make deliberately unusable practice capture variants.
// No variant is presented as an authentic GitHub artifact.
export function practiceCaptures() {
  const command = fileURLToPath(new URL('./cli.mjs', import.meta.url));
  const method = sha256(readFileSync(command));
  const capture = area => {
    const input = JSON.stringify({ area });
    const result = spawnSync(process.execPath, [command, input], { encoding: 'utf8' });
    if (result.error || result.status === null) throw new Error('practice command could not start');
    return {
      practice: true, subjectSha: PRACTICE_SHA, command: ['node', 'cli.mjs', input],
      exitCode: result.status, stdout: result.stdout, stderr: result.stderr,
      inputSha256: sha256(input), methodSha256: method, environment: 'practice-node',
    };
  };
  const head = capture('notes');
  return {
    'lookup-a': head,
    'lookup-b': capture('exports'),
    'lookup-c': { ...head, subjectSha: 'b'.repeat(40) },
    'lookup-d': '{"practice":true,"subjectSha":',
    'lookup-e': { ...head, baseline: { ...head, subjectSha: 'c'.repeat(40), inputSha256: sha256('different input') } },
  };
}
