#!/usr/bin/env node
// Described reads invoke the existing CLI with no new store/query implementation.
import { readFileSync } from 'node:fs';
import { execFile } from 'node:child_process';
import { promisify } from 'node:util';
import { createHash } from 'node:crypto';
import { fileURLToPath } from 'node:url';
import { parseOperationInput } from './lib/operations.mjs';
import { READ_INPUTS, readArguments } from './lib/read-options.mjs';
import { redact, secretValues } from './lib/scan.mjs';
import { loadEnv, repoContext } from './lib/store.mjs';
import { isMain, parseCli } from './lib/cli.mjs';

const runFile = promisify(execFile);
const MAX_TEXT = 32768;
const descriptions = Object.entries(READ_INPUTS).map(([command, properties]) => ({
  operationId: `memory.${command}`, summary: command === 'search' ? 'Search remembered facts' : 'Read a memory topic',
  description: command === 'search' ? 'Use the existing memory search and permitted filters.' : 'Read existing topic facts and open threads.',
  source: 'memory', transport: 'installed-client', authentication: 'installed-memory-credential', effect: 'read',
  readiness: 'not_checked', app: 'memory',
  inputSchema: { type: 'object', properties, additionalProperties: false, ...(command === 'show' ? { required: ['slug'] } : {}) },
  outputSchema: { type: 'object', required: ['text', 'truncated'], additionalProperties: false, properties: {
    text: { type: 'string', maxLength: MAX_TEXT }, truncated: { type: 'boolean' } } },
  errors: { invalid_input: 'Invalid memory input', unavailable: 'Memory is unavailable; use the installed memory guidance', output_limit: 'Memory output exceeds its bound' },
  examples: [{ input: command === 'search' ? { terms: 'delivery', limit: 5 } : { slug: 'sample-topic' }, output: { text: 'Synthetic remembered knowledge.', truncated: false } }],
}));
const revision = createHash('sha256').update(JSON.stringify(descriptions)).digest('hex');
export const memoryOperations = descriptions.map(operation => ({ ...operation, revision }));

export async function callMemory(operationId, input, { cwd = process.cwd(), execute = runFile } = {}) {
  if (!memoryOperations.some(operation => operation.operationId === operationId)) throw new Error('Unknown installed memory operation');
  const args = readArguments(operationId.slice('memory.'.length), input);
  // Validate before context, credential loading or any store access.
  const ctx = repoContext(cwd);
  const secrets = [...secretValues(loadEnv(ctx)), ...secretValues({ token: process.env.CLOUDFLARE_MEMORY_TOKEN })];
  try {
    const { stdout } = await execute(process.execPath, [fileURLToPath(new URL('./memory.mjs', import.meta.url)), operationId.slice(7), ...args],
      { cwd, encoding: 'utf8', maxBuffer: 1048576, timeout: 30000, windowsHide: true });
    const text = redact(stdout, secrets);
    return { text: text.slice(0, MAX_TEXT), truncated: text.length > MAX_TEXT };
  } catch (error) {
    // Existing commands own detailed private diagnostics; the adapter never forwards stderr.
    return { error: { code: error.code === 'ERR_CHILD_PROCESS_STDIO_MAXBUFFER' ? 'output_limit' : 'unavailable',
      message: 'Memory read did not complete. See wiki/development/memory-key.md for the existing installation and access procedure.' } };
  }
}
const USAGE = 'usage: operations.mjs list | describe <id> | call <id> --file <JSON file or ->  described memory reads with the existing credential';
if (isMain(import.meta.url)) {
  const { positionals: [command, id], values } = parseCli({ usage: USAGE, allowPositionals: true, options: { file: { type: 'string' } } });
  try {
    if (command === 'list') console.log(JSON.stringify(memoryOperations.map(({ operationId, summary, revision, readiness }) => ({ operationId, summary, revision, readiness }))));
    else if (command === 'describe') {
      const selected = memoryOperations.find(operation => operation.operationId === id);
      if (!selected) throw new Error('Unknown memory operation');
      console.log(JSON.stringify(selected));
    } else if (command === 'call') console.log(JSON.stringify(await callMemory(id, parseOperationInput(readFileSync(values.file === '-' ? 0 : values.file, 'utf8')))));
    else throw new Error(USAGE);
  } catch (error) { console.error(error.message); process.exitCode = 1; }
}
