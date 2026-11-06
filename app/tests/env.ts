// Stand-ins for the Worker's bindings. A test names the parts its code reads; any other part reads as
// `undefined`, as on an app that never bound it. Each builder narrows once, here, so no test casts.

/** The Worker's bindings, holding only what a test names. */
export const fakeEnv = <Named extends object>(named: Named) => named as Env & Named;

/** Cloudflare's binding to a project kept there, as `wrangler types` types it, with only the calls a test answers. */
export const fakeArtifacts = <Calls extends object>(calls: Calls) => calls as Artifacts & Calls;
