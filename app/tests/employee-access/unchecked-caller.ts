// Only the type check reads this file: nothing runs it. Each marked line must fail to compile.
// If one ever compiles, the type check fails here, and a pass can be made without the sign-in check again.
import type { ConnectionEnv, Core, OwnerCore } from "../../worker/employee-access/core.ts";

declare const db: D1DatabaseSession;
declare const env: ConnectionEnv;
declare const checkedCore: Core;
declare const anySave: (core: Core) => void;
declare const ownerSave: (core: OwnerCore) => void;

// @ts-expect-error A pass written by hand lacks the mark that only ownerCore() gives.
anySave({ db, env, installationId: "", origin: "", email: "", actor: "", owner: true, subject: "", live: true });
// @ts-expect-error A pass that may be a manager's is not the owner's.
ownerSave(checkedCore);
