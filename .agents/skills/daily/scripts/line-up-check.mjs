#!/usr/bin/env node
// The line-up's check: one `run` line when a watched chat has news the map has not read, else nothing.
// wiki/development/daily.md#your-chats-in-line
import { readFileSync } from 'node:fs';
import { isMain } from '../../memory/scripts/lib/cli.mjs';
import { stateDirectory } from './daily.mjs';
import { lineUpDue } from './line-up.mjs';

if (isMain(import.meta.url)) {
  const context = JSON.parse(readFileSync(0, 'utf8') || '{}');
  const run = lineUpDue({ stateDir: stateDirectory(context.repo, context.person), timezone: context.timezone });
  if (run) console.log(JSON.stringify({ run }));
}
