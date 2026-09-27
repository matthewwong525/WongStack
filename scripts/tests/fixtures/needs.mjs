// A test that needs an installed dependency (scripts/tests/package.json) or a
// browser skips without it locally, and fails in CI: a missing install must
// never turn the check green with the tests skipped.
export function needs(missing, reason) {
  if (!missing) return {};
  if (process.env.CI) throw new Error(`${reason} — CI must run these tests`);
  return { skip: reason };
}
