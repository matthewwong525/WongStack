// Every saved business-service key the owner sees in Access. One entry per key: a stable id,
// a plain title, the runtime secrets it covers (declared in ../.dev.vars.example), and the
// levels it offers: Read and Read & write unless it says otherwise. A key listed here shows in
// Access (wiki/stack/api-keys.md), and a route reaches only the keys it lists
// (wiki/stack/company-api.md).
export type Level = "read" | "write";
/** How the app passes one request on to the key's service, once the owner turns direct use on for the key in
 *  Access. `base` is the service's one HTTPS address, ending in `/`. `secret` is the one of the key's `secrets` that
 *  is sent, in the request header `header`, after `prefix`. `headers` are fixed extras the service needs. `lookups`
 *  are requests that only read although their method is not GET or HEAD, as `METHOD path` with `*` for one path
 *  part: list only what the service's own guide documents as read-only. wiki/stack/company-api.md#use-a-key-directly */
export type Forward = {
  base: string;
  secret: string;
  header: string;
  prefix?: string;
  headers?: Readonly<Record<string, string>>;
  lookups?: readonly string[];
};
type Key = {
  title: string;
  secrets: readonly string[];
  levels?: readonly ["read"] | readonly ["read", "write"];
  /** Setup makes this key itself, so no private link is sent for it. */
  setup?: true;
  /** The Worker's own route uses it, so it works with no app and no route lists it. */
  alone?: true;
  /** Bindings that go with the key: a route that does not list the key is handed none of them. */
  bindings?: readonly string[];
  /** The service can be used directly through the app. Never on a key with `setup` or `alone`. */
  forward?: Forward;
};

export const keys = {
  // Look-ups only, so Read is the one level. wiki/stack/company-api.md#look-things-up-in-cloudflare
  cloudflare: { title: "Cloudflare", secrets: ["WONG_CLOUDFLARE_READ"], levels: ["read"], setup: true },
  // The project itself, read through /api/access/code/git/ and nowhere else. On a project kept in Cloudflare
  // the ARTIFACTS binding stands in for the secret. wiki/stack/employee-project.md
  code: { title: "Project code", secrets: ["WONG_CODE_READ"], levels: ["read"], alone: true, bindings: ["ARTIFACTS"] },
  // stripe: { title: "Stripe", secrets: ["STRIPE_SECRET_KEY"] },
  // notion: { title: "Notion", secrets: ["NOTION_TOKEN"], forward: {
  //   base: "https://api.notion.com/v1/", secret: "NOTION_TOKEN", header: "Authorization", prefix: "Bearer ",
  //   headers: { "Notion-Version": "2022-06-28" }, lookups: ["POST search", "POST databases/*/query"],
  // } },
} as const satisfies Record<string, Key>;

/** A registered key's id, for a route's `keys` list. @public */
export type KeyId = keyof typeof keys;
