// `key send`: one key sealed on this computer with the app's public key, or sealed already, and sent to the live
// app. The plain value is in no argument, output or request. wiki/stack/connect-your-tools.md
import { readFileSync } from 'node:fs';

/** The body a send carries: `{ sealed, ends }`, from a value read from stdin or from a file sealed already. An answer
 *  with an `error` is the app's refusal, to print as it is. */
export async function sealedBody(client, name, { valueStdin, sealedFile, read = file => readFileSync(file, 'utf8') }) {
  if (!valueStdin) return { body: JSON.parse(read(sealedFile === '-' ? 0 : sealedFile)) };
  const value = read(0).replace(/\r?\n$/, '');
  if (!value.trim()) throw new Error(`No key on stdin for ${name}.`);
  const { value: lock } = await client.http('/api/access/keys/seal');
  if (lock.error) return { refused: lock };
  const { seal } = await import('../../screen/seal.mjs');
  const sealed = await seal(value, lock.publicKey);
  return { body: { sealed: typeof sealed === 'string' ? JSON.parse(sealed) : sealed, ends: value.slice(-4) } };
}
