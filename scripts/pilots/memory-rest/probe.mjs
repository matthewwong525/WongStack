#!/usr/bin/env node
// Read-only CLI. Mutation entrypoints require the parent's separately reviewed private runner.
import { readFileSync } from 'node:fs';
import { isMain, parseCli, usageError } from '../../lib-cli.mjs';
import { planMemoryRestProbe } from './plan.mjs';

export { planMemoryRestProbe } from './plan.mjs';
export { runRestTransportProbe } from './transport.mjs';
export { runMemoryInitializationProbe } from './initialization.mjs';

if (isMain(import.meta.url)) {
  const usage = 'usage: node scripts/pilots/memory-rest/probe.mjs --manifest <owned-manifest.json> --input <probe-input.json>';
  const { values } = parseCli({ usage, options: { manifest: { type: 'string' }, input: { type: 'string' } } });
  if (!values.manifest || !values.input) usageError(usage, '--manifest and --input are required');
  try {
    const plan = await planMemoryRestProbe(JSON.parse(readFileSync(values.manifest, 'utf8')), JSON.parse(readFileSync(values.input, 'utf8')));
    console.log(JSON.stringify(plan, null, 2));
  } catch { console.error('Probe plan refused: check the source gate, owned memory receipt and exact input. No provider call was made.'); process.exitCode = 1; }
}
