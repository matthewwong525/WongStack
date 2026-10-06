// Every saved business-service key the owner sees in Access. One entry per key: a stable id,
// a plain title, the runtime secrets it covers (declared in ../.dev.vars.example), and the
// levels it offers: Read and Read & write unless it says otherwise. A key listed here shows in
// Access (wiki/stack/api-keys.md), and a route reaches only the keys it lists
// (wiki/stack/company-api.md).
export type Level = "read" | "write";
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
};

export const keys = {
  // Look-ups only, so Read is the one level. wiki/stack/company-api.md#look-things-up-in-cloudflare
  cloudflare: { title: "Cloudflare", secrets: ["WONG_CLOUDFLARE_READ"], levels: ["read"], setup: true },
  // The project itself, read through /api/access/code/git/ and nowhere else. On a project kept in Cloudflare
  // the ARTIFACTS binding stands in for the secret. wiki/stack/employee-project.md
  code: { title: "Project code", secrets: ["WONG_CODE_READ"], levels: ["read"], alone: true, bindings: ["ARTIFACTS"] },
  // stripe: { title: "Stripe", secrets: ["STRIPE_SECRET_KEY"] },
} as const satisfies Record<string, Key>;

/** A registered key's id, for a route's `keys` list. @public */
export type KeyId = keyof typeof keys;
