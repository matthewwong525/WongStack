/**
 * Which files are tests, for the loosened-check guard (`loosened-checks.mjs`),
 * which reads a test file for switched-off tests and flags a deleted one.
 *
 * The rule is every name Node's test runner picks up by default (`*.test.*`,
 * `*-test.*`, `*_test.*`, `test-*`, `test.*`, and anything under a `test/`
 * folder), plus the `*.spec.*` and `test_*` names other runners use. Any
 * extension counts, so a TypeScript or React test is caught too.
 */
export const TEST_FILE = /(^|\/)(test\/|[^/]*[-._]test\.[^/]+$|[^/]*\.spec\.[^/]+$|test[-._][^/]*$)/;
