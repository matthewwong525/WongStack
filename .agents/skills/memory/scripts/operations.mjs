#!/usr/bin/env node
// Described reads invoke the existing CLI with no new store/query implementation.
import { readFileSync } from 'node:fs';
import { execFile } from 'node:child_process';
import { promisify } from 'node:util';
import { createHash } from 'node:crypto';
import { fileURLToPath } from 'node:url';
import { parseOperationInput } from './lib/operations.mjs';
import { READ_INPUTS, readArguments } from './lib/read-options.mjs';
import { validateRetrieval } from './lib/documents/input.mjs';
import { PACKET_BYTES } from './lib/documents/packet.mjs';
import { redact, secretValues } from './lib/scan.mjs';
import { loadEnv, repoContext } from './lib/store.mjs';
import { isMain, parseCli } from './lib/cli.mjs';

const runFile = promisify(execFile);
const MAX_TEXT = 32768;
const statusSchema = { type: 'object', required: ['state'], additionalProperties: false,
  properties: { state: { type: 'string', enum: ['ok', 'empty', 'partial', 'unavailable', 'denied'] }, reason: { type: 'string', maxLength: 180 } } };
const factSchema = { type: 'object', required: ['id', 'slug', 'type', 'body', 'created_at', 'session_id', 'superseded_by'],
  properties: { id: { type: 'integer' }, slug: { type: 'string' }, type: { type: 'string' }, body: { type: 'string' },
    author: { type: ['string', 'null'] }, created_at: { type: 'string' }, session_id: { type: ['string', 'null'] }, state: { type: 'string' }, superseded_by: { type: 'null' } }, additionalProperties: false };
const documentSchema = { type: 'object', required: ['path', 'role', 'hash', 'heading', 'startLine', 'endLine', 'text', 'truncated', 'freshness', 'reference'],
  properties: { path: { type: 'string' }, role: { enum: ['wiki', 'specs', 'active', 'archive'] }, hash: { type: 'string', pattern: '^[a-f0-9]{64}$' },
    heading: { type: 'string' }, startLine: { type: 'integer', minimum: 1 }, endLine: { type: 'integer', minimum: 1 },
    text: { type: 'string' }, truncated: { type: 'boolean' }, freshness: { const: 'verified' }, reference: { type: 'string' }, score: { type: 'number' } }, additionalProperties: false };
const descriptions = Object.entries(READ_INPUTS).filter(([command]) => ['search', 'show'].includes(command)).map(([command, properties]) => ({
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
for (const command of ['documents', 'recall']) descriptions.push({
  operationId: `memory.${command}`, summary: command === 'documents' ? 'Find original wiki and OpenSpec passages' : 'Recall permitted facts and original document evidence',
  description: 'Search current checkout guidance by default; history and proposed work require explicit scope. Read cited originals before acting. Optional prepared QMD improves ranking; live keyword fallback remains available.',
  source: 'memory', transport: 'installed-client', authentication: command === 'documents' ? 'local-checkout' : 'local-checkout-and-installed-memory-credential-for-facts',
  sourceAuthentication: { documents: 'local-checkout', ...(command === 'recall' ? { facts: 'installed-memory-credential' } : {}) },
  effect: 'read', cacheEffects: 'May maintain checkout-specific derived document index; never installs or downloads on a read.',
  readiness: 'not_checked', app: 'memory',
  inputSchema: { type: 'object', properties: READ_INPUTS[command], additionalProperties: false, required: ['question'] },
  outputSchema: { type: 'object', required: ['version', 'scope', 'mode', 'change', 'documentLimit', 'backend', 'coverage', 'requestedModeState', 'sources', 'facts', 'documents', 'omitted'],
    properties: { version: { const: 1 }, question: { type: 'string' }, scope: { type: 'string' }, mode: { type: 'string' }, backend: { type: 'string' },
      change: { type: ['string', 'null'] }, documentLimit: { type: 'integer', minimum: 1, maximum: 5 },
      coverage: { enum: ['complete', 'partial', 'unavailable'] }, requestedModeState: { enum: ['ok', 'partial', 'unavailable'] }, filters: { type: 'object' },
      sources: { type: 'object', required: ['facts', 'documents'], additionalProperties: false, properties: { facts: statusSchema, documents: statusSchema } },
      facts: { type: 'array', maxItems: 8, items: factSchema }, documents: { type: 'array', maxItems: 5, items: documentSchema },
      omitted: { type: 'object', required: ['facts', 'documents'], additionalProperties: false,
        properties: { facts: { type: 'integer', minimum: 0 }, documents: { type: 'integer', minimum: 0 } } } },
    additionalProperties: false, maxBytes: PACKET_BYTES },
  errors: { invalid_input: 'Invalid retrieval input', unavailable: 'No usable retrieval source', output_limit: 'Evidence packet exceeds its bound' },
  examples: [{ input: { question: 'How do we publish a finished change?', mode: 'keyword' },
    output: { version: 1, question: 'Synthetic task question', scope: 'current', mode: 'keyword', change: null, documentLimit: 5, backend: 'lexical-fallback',
      coverage: 'unavailable', requestedModeState: 'ok', filters: {}, sources: { facts: { state: 'unavailable' }, documents: { state: 'empty' } },
      facts: [], documents: [], omitted: { facts: 0, documents: 0 } } }],
});
const revision = createHash('sha256').update(JSON.stringify(descriptions)).digest('hex');
export const memoryOperations = descriptions.map(operation => ({ ...operation, revision }));

export async function callMemory(operationId, input, { cwd = process.cwd(), execute = runFile } = {}) {
  if (!memoryOperations.some(operation => operation.operationId === operationId)) throw new Error('Unknown installed memory operation');
  const args = readArguments(operationId.slice('memory.'.length), input);
  const command = operationId.slice(7), structured = ['documents', 'recall'].includes(command);
  if (structured) validateRetrieval(input.question, Object.fromEntries(Object.entries(input).filter(([key]) => key !== 'question')), { recall: command === 'recall' });
  // Validate before context, credential loading or any store access.
  const ctx = repoContext(cwd);
  const secrets = command === 'documents' ? [] : [...secretValues(loadEnv(ctx)), ...secretValues({ token: process.env.CLOUDFLARE_MEMORY_TOKEN })];
  try {
    const { stdout } = await execute(process.execPath, [fileURLToPath(new URL('./memory.mjs', import.meta.url)), operationId.slice(7), ...args],
      { cwd, encoding: 'utf8', maxBuffer: 1048576, timeout: 30000, windowsHide: true });
    const text = redact(stdout, secrets);
    if (structured) {
      if (Buffer.byteLength(stdout) > PACKET_BYTES) return { error: { code: 'output_limit', message: 'Evidence packet exceeds its bound' } };
      const packet = JSON.parse(text);
      if (packet.version !== 1 || !packet.sources || !Array.isArray(packet.facts) || !Array.isArray(packet.documents)) throw new Error('Invalid evidence packet');
      return packet;
    }
    return { text: text.slice(0, MAX_TEXT), truncated: text.length > MAX_TEXT };
  } catch (error) {
    // Existing commands own detailed private diagnostics; the adapter never forwards stderr.
    return { error: { code: error.code === 'ERR_CHILD_PROCESS_STDIO_MAXBUFFER' ? 'output_limit' : 'unavailable',
      message: command === 'documents' ? 'Local document read did not complete. See wiki/development/document-retrieval.md.'
        : 'Memory read did not complete. See wiki/development/memory-key.md for the existing installation and access procedure.' } };
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
