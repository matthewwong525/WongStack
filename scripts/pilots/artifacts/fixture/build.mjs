import { readFileSync, writeFileSync } from 'node:fs';
import { createHash } from 'node:crypto';
const sha = process.env.PILOT_COMMIT;
if (!/^[a-f0-9]{40}$/.test(sha || '')) throw new Error('Missing exact checkout commit');
const code = readFileSync('worker.mjs', 'utf8').replaceAll('__PILOT_COMMIT__', sha);
writeFileSync('built-worker.mjs', code);
console.log(`PILOT_RESULT=${JSON.stringify({ sha, code: Buffer.from(code).toString('base64'), digest: createHash('sha256').update(code).digest('hex') })}`);
