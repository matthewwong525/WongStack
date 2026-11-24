#!/usr/bin/env node
// Code check: each outside service's definition, by lib/check-definitions.mjs. `--root` names the repo (default: the
// one this folder is installed in); `--types` rewrites each types file first.
import { resolve } from 'node:path';
import { parseArgs } from 'node:util';
import { checkDefinitions } from './lib/check-definitions.mjs';
import { REPO } from './services.mjs';

const USAGE = `usage: check-definitions.mjs [--root <repo>] [--types]

--root <repo>  the repo to check; default: the one this script sits in
--types        rewrite each service's types file from its definition first`;

let values;
try { ({ values } = parseArgs({ options: { root: { type: 'string' }, types: { type: 'boolean' }, help: { type: 'boolean' } } })); }
catch (error) { console.error(`${error.message}\n\n${USAGE}`); process.exit(2); }
if (values.help) { console.log(USAGE); process.exit(0); }
const { ok, out, err } = await checkDefinitions(resolve(values.root ?? REPO), { types: values.types });
if (out) console.log(out);
for (const line of err) console.error(line);
process.exit(ok ? 0 : 1);
