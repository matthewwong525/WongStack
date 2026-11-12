export type Level = "read" | "write";
/** A person's own set or a role's set: the apps given, and a level per saved key. */
export type AccessSet = { apps: readonly string[]; keys: Readonly<Record<string, Level>> };
/** One snapshot for one caller. `apps` or `keys` is null when the store could not read it. */
export type PolicyRow = { started: boolean; keysStarted: boolean; revision: number; status: "active" | "removed" | null;
  role: string | null; apps: readonly string[] | null; keys: Readonly<Record<string, Level>> | null };
/** `unticked`: apps the person or role could only look at, which a tick can not say.
 *  `settled`: the sign-in list matches. */
export type StoredSets = {
  people: { email: string; status: "active" | "removed"; settled: boolean; role: string | null; apps: string[]; unticked: string[];
    keys: Record<string, Level> }[];
  roles: { id: string; name: string; apps: string[]; unticked: string[]; keys: Record<string, Level> }[];
};
export type WorkRow = { kind: string; status: string; outcome: string | null; error_code: string | null };
export type StoreStatus = { started: boolean; keysStarted: boolean; imported: number; work: WorkRow[] };
export type Step = { generation: number; status: string; scope: "both" | "previews" };
export type ToolRow = { id: string; title: string; purpose: string; docs: string; forward_json: string; levels_json: string };
/** `apps` on a save: every app the project lists, kept listed so a new one shows up unticked. */
export type Store = {
  policy(email: string): Promise<PolicyRow | null>;
  open(first: { origin: string; owner: string; subject: string }): Promise<void>;
  admin(email: string): Promise<boolean>;
  installed(): Promise<{ origin: string } | null>;
  started(): Promise<{ policy: boolean; keys: boolean }>;
  listApps(ids: readonly string[]): Promise<void>;
  sets(): Promise<StoredSets>;
  /** `role` undefined keeps the role row as it is; null clears it. `steps`: the sign-in list steps to queue. */
  savePerson(save: { actor: string; apps: readonly string[]; email: string; status: "active" | "removed"; own: AccessSet;
    role: string | null | undefined; steps: readonly string[]; events: readonly string[] }): Promise<void>;
  saveRole(save: { actor: string; apps: readonly string[]; id: string; name: string; set: AccessSet; events: readonly string[] }): Promise<void>;
  removeRole(save: { actor: string; apps: readonly string[]; id: string; holders: readonly { email: string; set: AccessSet }[];
    events: readonly string[] }): Promise<void>;
  /** The first open: everyone `admitted` but the owner and the people already listed gets every app in `given`. */
  start(first: { actor: string; apps: readonly string[]; given: readonly string[]; owner: string; admitted: readonly string[] }): Promise<number>;
  startKeys(): Promise<void>;
  status(): Promise<StoreStatus | null>;
  audit(actor: string, event: string): Promise<void>;
  audited(event: string): Promise<boolean>;
  lease(): Promise<string | null>;
  release(holder: string): Promise<void>;
  leaseCurrent(holder: string | undefined): Promise<boolean>;
  step(kind: string): Promise<Step | null>;
  stepFailed(failed: { kind: string; generation: number; code: string }): Promise<void>;
  stepStale(kind: string): Promise<void>;
  stepUnresolved(): Promise<void>;
  stepDone(done: { kind: string; generation: number; holder: string; outcome: string }): Promise<void>;
  stepWaiting(): Promise<boolean>;
  beginWrite(write: { generation: number; holder: string }): Promise<string | null>;
  endWrite(intent: string, status: "completed" | "unknown"): Promise<void>;
  unresolvedWrites(): Promise<boolean>;
  listed(): Promise<string[]>;
  tools(): Promise<ToolRow[]>;
  saveTool(save: { row: ToolRow; actor: string; clearLevels: boolean }): Promise<void>;
  removeTool(id: string, actor: string): Promise<void>;
  sealed(): Promise<Map<string, string>>;
  saveSealed(save: { name: string; sealed: string; ends: string; actor: string }): Promise<void>;
};
export declare const PEOPLE: readonly string[];
export declare const SIGN_IN_LIST: readonly string[];
export declare const SERVICES: readonly string[];
export declare const OPERATIONS: readonly string[];
export declare const missingOperations: (store: unknown) => string[];
