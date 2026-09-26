/**
 * Each mini app's handler, by folder name: `apps/<name>/api.mjs` becomes
 * `routes["<name>"]`. Vite resolves the glob when it bundles the main app's
 * Worker, so a new app needs no edit here.
 */
const modules = import.meta.glob("./apps/*/api.mjs", { eager: true });

export default Object.fromEntries(
	Object.entries(modules).map(([path, module]) => [path.split("/")[2], module.default]),
);
