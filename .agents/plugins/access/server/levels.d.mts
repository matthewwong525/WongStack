export type Level = "read" | "write";
/** How the app passes one request on to the key's service. */
export type Forward = {
  base: string; secret?: string; header?: string; prefix?: string; headers?: Readonly<Record<string, string>>;
  lookups?: readonly string[]; exchange?: { url: string };
};
/** One key as the registry holds it. `chat`: a tool added from a chat. `saved`: the project says whether it is saved.
 *  `routeAlone`: a route uses it with no app, which Access shows. */
export type KeyEntry = { title: string; purpose: string; docs?: string; secrets: readonly string[]; levels?: readonly Level[];
  setup?: true; liveOnly?: true; alone?: true; bindings?: readonly string[]; forward?: Forward; chat?: true; saved?: boolean; routeAlone?: boolean };
export type Registry = Readonly<Record<string, KeyEntry>>;
export declare const pasted: (key: KeyEntry) => boolean;
export declare const keyIds: (registry: Registry) => string[];
export declare const registered: (registry: Registry, id: string) => boolean;
export declare const keyTitle: (registry: Registry, id: string) => string;
export declare const madeBySetup: (registry: Registry, id: string) => boolean;
export declare const liveOnly: (registry: Registry, id: string) => boolean;
export declare const worksAlone: (registry: Registry, id: string) => boolean;
export declare const offered: (registry: Registry, id: string) => readonly Level[];
export declare const forwards: (registry: Registry, id: string) => boolean;
export declare const described: (registry: Registry, id: string) => { purpose: string; docs?: string };
export declare const reads: (registry: Registry, id: string) => readonly string[];
export declare const levelName: (level: Level) => string;
export declare const holds: (level: Level | undefined, need: Level) => boolean;
export declare const chatTools: (registry: Registry) => Registry;
export declare const everyKey: (registry: Registry) => Map<string, Level>;
export declare const heldLevels: (registry: Registry, stored: Readonly<Record<string, Level>>) => Map<string, Level>;
export declare const saved: (registry: Registry, secret: (name: string) => unknown, id: string) => boolean;
export declare const keyCatalogue: (registry: Registry, secret: (name: string) => unknown, waiting: ReadonlyMap<string, string>) => object[];
