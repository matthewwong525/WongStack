/** Which files are tests, for `loosened-checks.mjs`: every name Node's test runner picks up by default, plus the
 * `*.spec.*` and `test_*` names other runners use. Any extension counts, so a TypeScript test is caught too. */
export const TEST_FILE = /(^|\/)(test\/|[^/]*[-._]test\.[^/]+$|[^/]*\.spec\.[^/]+$|test[-._][^/]*$)/;
