import type { Store } from "../store/interface.mjs";
export type Authority = { version: 2 | 3; token: string; accountId: string; policyId: string; staging?: { appId: string; policyId: string } };
export type ListConfig = {
  key(): string | undefined; appId?: string; audience?: string; workerId?: string;
  previews?(options: { store: Store }): Promise<readonly string[]>;
};
export type CloudflareList = {
  ready(): boolean;
  split(): boolean;
  admitted(options?: { store: Store }): Promise<string[]>;
  reconcile(options: { store: Store; owner: string; holder: string; kind: "policy" | "sessions" }): Promise<void>;
  drifted(options: { store: Store; owner: string }): Promise<boolean>;
};
export declare function loginAuthority(json: string | undefined): Authority | null;
export declare function provider(path: string, token: string, method?: string, body?: object): Promise<unknown>;
export declare function cloudflareList(config: ListConfig): CloudflareList;
