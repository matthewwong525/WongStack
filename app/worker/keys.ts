// Every saved business-service key the owner sees in Access (wiki/stack/api-keys.md): an id, a title, the secrets
// it covers (in ../.dev.vars.example) and its levels. A route reaches only the keys it lists: wiki/stack/company-api.md
export type Level = "read" | "write";
/** How the app passes one request on to the key's service: wiki/stack/company-api.md#use-a-key-directly. `lookups`
 *  are documented non-GET reads, as `METHOD path`, `*` for one part. With no secrets, name no `secret` or `header`. */
export type Forward = {
  base: string;
  secret?: string;
  header?: string;
  prefix?: string;
  headers?: Readonly<Record<string, string>>;
  lookups?: readonly string[];
  /** An MCP server at `path` under `base`, the one path passed on; `reads` names the tools that only look things up.
   *  wiki/stack/company-api.md#use-an-mcp-server-through-the-app */
  mcp?: { path: string; reads: readonly string[] };
};
type Key = {
  title: string;
  /** What the service is for, in one line of at most 80 characters: the services list shows it. */
  purpose: string;
  /** The service's public API guide, HTTPS: required with `forward`, so a chat using it directly can read it. */
  docs?: string;
  secrets: readonly string[];
  levels?: readonly ["read"] | readonly ["read", "write"];
  /** Setup makes this key itself, so no private link is sent for it. */
  setup?: true;
  /** Only the live app may ever hold it: branch code runs on previews. */
  liveOnly?: true;
  /** The Worker's own route uses it, so it works with no app and no route lists it. */
  alone?: true;
  /** Bindings that go with the key: a route that does not list the key is handed none of them. */
  bindings?: readonly string[];
  /** The service can be used directly through the app. Never on a key with `setup` or `alone`. */
  forward?: Forward;
};

export const keys = {
  // Look-ups only, so Read is the one level. wiki/stack/company-api.md#look-things-up-in-cloudflare
  cloudflare: { title: "Cloudflare", purpose: "Look up this account's Workers, databases, logs and usage",
    docs: "https://developers.cloudflare.com/api/", secrets: ["WONG_CLOUDFLARE_READ"], levels: ["read"], setup: true, liveOnly: true },
  // The project, through /api/access/code/ only: Read installs and saves, Write also publishes. Either secret reads,
  // the second saves and publishes; on Cloudflare ARTIFACTS stands in for both. wiki/stack/employee-project.md
  code: { title: "Project code", purpose: "This project's own code, to install it and save changes", secrets: ["WONG_CODE_READ", "WONG_CODE_WRITE"], levels: ["read", "write"], alone: true, bindings: ["ARTIFACTS", "CODE_CHECKS"],
    liveOnly: true },
  // Add a key as: stripe: { title: "Stripe", purpose: "Payments and refunds", secrets: ["STRIPE_SECRET_KEY"] },
  // Direct use adds `forward` and `docs: "https://docs.stripe.com/api"`: wiki/stack/company-api.md#use-a-key-directly

  // An MCP server adds `mcp` to `forward`, and a public one has no secrets, `secret` or `header`:
  // wiki/stack/company-api.md#use-an-mcp-server-through-the-app
} as const satisfies Record<string, Key>;

/** A registered key's id, for a route's `keys` list. @public */
export type KeyId = keyof typeof keys;
