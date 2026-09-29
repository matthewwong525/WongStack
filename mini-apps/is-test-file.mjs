/**
 * Which files are tests. One rule for everything that asks: CI runs these files
 * as a mini app's tests, the build leaves them out of the published pages, the
 * Worker refuses to serve them, and the loosened-check guard reads them for
 * switched-off tests. Four copies of this rule drifted apart, and a file one
 * of them called a test and another did not was run by CI and published too.
 *
 * The rule is every name Node's test runner picks up by default (`*.test.*`,
 * `*-test.*`, `*_test.*`, `test-*`, `test.*`, and anything under a `test/`
 * folder), plus the `*.spec.*` and `test_*` names other runners use. Any
 * extension counts, so a TypeScript test is caught too. Test a path relative
 * to the app folder: an app named `test` is not a test folder.
 *
 * Plain JavaScript with no Node import at the top level, so the Worker bundles
 * it through `router.mjs`; the CLI below loads what it needs when it runs.
 *
 *     node mini-apps/is-test-file.mjs <folder>
 *
 * Prints each test file in the folder that Node can run (JavaScript or
 * TypeScript), relative to it and skipping node_modules, one per line, so CI
 * runs exactly these; a `test/fixture.json` stays private but is not run.
 * Exit 0 when there is one, 1 when there is none, 2 on a usage error.
 */

export const TEST_FILE = /(^|\/)(test\/|[^/]*[-._]test\.[^/]+$|[^/]*\.spec\.[^/]+$|test[-._][^/]*$)/;

/** Whether `path`, relative to an app folder or the repo, names a test file. */
export const isTestFile = path => TEST_FILE.test(path);

const RUNNABLE = /\.[cm]?[jt]s$/;

/** Every test file Node can run below `dir`, outside node_modules, relative to it and sorted. */
export async function testFiles(dir) {
	const { readdirSync } = await import("node:fs");
	const { join, relative } = await import("node:path");
	return readdirSync(dir, { recursive: true, withFileTypes: true })
		.filter(entry => entry.isFile())
		.map(entry => relative(dir, join(entry.parentPath, entry.name)).split("\\").join("/"))
		.filter(path => RUNNABLE.test(path) && !/(^|\/)node_modules\//.test(path) && isTestFile(path))
		.sort();
}

async function cli() {
	const { existsSync, realpathSync, statSync } = await import("node:fs");
	const { fileURLToPath } = await import("node:url");
	const { parseArgs } = await import("node:util");
	if (realpathSync(process.argv[1]) !== realpathSync(fileURLToPath(import.meta.url))) return;

	const usage = "usage: node mini-apps/is-test-file.mjs <folder>  (prints its test files; exit 0 when there is one, 1 when none)";
	let parsed;
	try {
		parsed = parseArgs({ options: { help: { type: "boolean" } }, allowPositionals: true, strict: true });
	} catch (error) {
		console.error(`${error.message}\n${usage}`);
		process.exit(2);
	}
	if (parsed.values.help) {
		console.log(usage);
		process.exit(0);
	}
	const [dir, ...extra] = parsed.positionals;
	if (!dir || extra.length || !existsSync(dir) || !statSync(dir).isDirectory()) {
		console.error(usage);
		process.exit(2);
	}
	const files = await testFiles(dir);
	for (const file of files) console.log(file);
	process.exit(files.length ? 0 : 1);
}

if (globalThis.process?.argv?.[1]?.endsWith("is-test-file.mjs")) cli();
