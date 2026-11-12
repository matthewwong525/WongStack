// The check on each outside service's definition: does it parse, describe every call, fit its examples, hold no
// private value, and match its types file? wiki/stack/service-catalogue.md#each-services-definition owns the rules.
import { checkServices, layout, serviceKeys, writeTypes } from './services.mjs';

/** The check's result for one repo: `ok`, and the lines to print, `out` for a pass and `err` for problems. `types`
 *  rewrites each service's types file from its definition first. */
export async function checkDefinitions(root, { types = false } = {}) {
  const keys = serviceKeys(root);
  const folder = layout(root).definitions;
  if (!keys.length) return { ok: true, out: `service definitions: no ${folder ? `${folder}/` : 'definitions folder'}, so nothing to check`, err: [] };
  if (types) writeTypes(root, keys);
  const problems = await checkServices({ root, keys });
  if (problems.length) return { ok: false, out: null,
    err: [...problems, `\n${problems.length} problem(s) in the service definitions: wiki/stack/service-catalogue.md#each-services-definition`] };
  return { ok: true, out: `service definitions: ${keys.length} service(s) described, their examples fit and hold no private value`, err: [] };
}
