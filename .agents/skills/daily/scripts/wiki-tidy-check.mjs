#!/usr/bin/env node
// The wiki tidy's check: one `run` line when memory consolidated since the last tidy claimed it, else nothing.
// The marker is memory's: wiki/development/wiki-dream.md#the-small-wiki-tidy
import { join } from 'node:path';
import { isMain } from '../../memory/scripts/lib/cli.mjs';
import { CONSOLIDATED, readJson, repoContext, writeJson } from '../../memory/scripts/lib/store.mjs';

/** Claims a consolidation newer than the last claim: `{consolidated: at}`, or null. */
export function claimTidy(file) {
  const marker = readJson(file, null);
  if (typeof marker?.at !== 'string' || (marker.claimed && marker.claimed >= marker.at)) return null;
  writeJson(file, { ...marker, claimed: marker.at });
  return { consolidated: marker.at };
}

if (isMain(import.meta.url)) {
  const run = claimTidy(join(repoContext().stateDir, CONSOLIDATED));
  if (run) console.log(JSON.stringify({ run }));
}
