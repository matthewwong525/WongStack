#!/usr/bin/env node
// Code check: does each outside service's definition in schema/services/ parse, describe every call, fit its
// examples, hold no private value, and match its types file? wiki/stack/service-catalogue.md owns the rules.
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { parseCli } from './lib-cli.mjs';
import { checkServices, serviceKeys, writeTypes } from './lib-services.mjs';

const USAGE = `usage: node scripts/check-service-definitions.mjs [--root <repo>] [--types]

--root <repo>  the repo to check; default: the one this script sits in
--types        rewrite each service's app/worker/services/<key>.ts from its definition first`;

const { values } = parseCli({ usage: USAGE, options: { root: { type: 'string' }, types: { type: 'boolean' } } });
const root = resolve(values.root ?? join(dirname(fileURLToPath(import.meta.url)), '..'));
const keys = serviceKeys(root);
if (!keys.length) {
  console.log('service definitions: no schema/services/, so nothing to check');
  process.exit(0);
}
if (values.types) writeTypes(root, keys);
const problems = await checkServices({ root, keys });
if (problems.length) {
  for (const problem of problems) console.error(problem);
  console.error(`\n${problems.length} problem(s) in the service definitions: wiki/stack/service-catalogue.md#each-services-definition`);
  process.exit(1);
}
console.log(`service definitions: ${keys.length} service(s) described, their examples fit and hold no private value`);
