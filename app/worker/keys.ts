// Every saved business-service key the owner sees in Access (wiki/stack/api-keys.md): an id, a title, the secrets
// it covers (in ../.dev.vars.example) and its levels. A route reaches only the keys it lists: wiki/stack/company-api.md
export type Level = "read" | "write";
/** How the app passes one request on to the key's service: wiki/stack/company-api.md#use-a-key-directly.
 *  `lookups` are non-GET requests that only read, as `METHOD path`, `*` for one path part: only documented ones. */
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
  // The project itself, read and saved through /api/access/code/ and nowhere else: either secret reads, the second
  // also saves. On Cloudflare the ARTIFACTS binding stands in for both. wiki/stack/employee-project.md
  code: { title: "Project code", secrets: ["WONG_CODE_READ", "WONG_CODE_WRITE"], levels: ["read"], alone: true, bindings: ["ARTIFACTS", "CODE_CHECKS"] },
  // Add a key as: stripe: { title: "Stripe", secrets: ["STRIPE_SECRET_KEY"] },
  // Direct use adds a `forward` entry: wiki/stack/company-api.md#use-a-key-directly
} as const satisfies Record<string, Key>;

/** A registered key's id, for a route's `keys` list. @public */
export type KeyId = keyof typeof keys;
