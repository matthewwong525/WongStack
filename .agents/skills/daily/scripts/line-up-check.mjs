#!/usr/bin/env node
// The line-up's check: one `run` line when an open chat has news the map has not read, else nothing.
// wiki/development/chats-in-line.md
import { readFileSync } from 'node:fs';
import { isMain } from '../../memory/scripts/lib/cli.mjs';
import { stateDirectory } from './daily.mjs';
import { lineUpDue } from './line-up.mjs';

if (isMain(import.meta.url)) {
  const context = JSON.parse(readFileSync(0, 'utf8') || '{}');
  const run = lineUpDue({ stateDir: stateDirectory(context.repo, context.person), project: context.repo });
  if (run) console.log(JSON.stringify({ run }));
}
