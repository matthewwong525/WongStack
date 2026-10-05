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
};

export const keys = {
  // Look-ups only, so Read is the one level. wiki/stack/company-api.md#look-things-up-in-cloudflare
  cloudflare: { title: "Cloudflare", secrets: ["WONG_CLOUDFLARE_READ"], levels: ["read"], setup: true },
  // stripe: { title: "Stripe", secrets: ["STRIPE_SECRET_KEY"] },
} as const satisfies Record<string, Key>;

/** A registered key's id, for a route's `keys` list. @public */
export type KeyId = keyof typeof keys;
