// What the app's Worker reads of run-id.mjs, which names a saved change's check run as the runner does.
export function runId(sha: string, ref: string): Promise<string>;
