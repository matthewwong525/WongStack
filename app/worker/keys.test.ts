import { readFileSync } from "node:fs";
import { expect, it } from "vitest";
import { keys } from "./keys";

// The core's own key for the sign-in list is no business key: no route lists it and Access shows no level for it.
const CORE = ["WONG_ACCESS_LOGIN_MANAGEMENT"];
type Registry = Record<string, { secrets: readonly string[] }>;

/** The names a file declares, and the setup-made `WONG_` names it keeps commented out. */
const names = (text: string) => [...text.matchAll(/^(?:# (?=WONG_)|export\s+)?([A-Za-z_][A-Za-z0-9_]*)\s*=/gm)]
  .map(match => match[1]).filter(name => !CORE.includes(name));

/** Every name that no key, or more than one key, covers. */
const problems = (text: string, registry: Registry) => names(text).flatMap(name => {
  const owners = Object.keys(registry).filter(id => registry[id].secrets.includes(name));
  return owners.length === 1 ? [] : [`${name}: ${owners.length ? `in ${owners.join(" and ")}` : "in no key"}`];
});

it("every secret name the Worker declares, and each key setup makes, belongs to exactly one key", () => {
  expect(problems(readFileSync(new URL("../.dev.vars.example", import.meta.url), "utf8"), keys)).toEqual([]);
  // The template registers the one key setup makes, offered at Read alone.
  expect(keys.cloudflare).toEqual({ title: "Cloudflare", secrets: ["WONG_CLOUDFLARE_READ"], levels: ["read"], setup: true });
});

it("fails for a name no key covers and for a name two keys cover, and passes a clean file", () => {
  const registry: Registry = { stripe: { secrets: ["STRIPE_SECRET_KEY"] }, cloudflare: { secrets: ["WONG_CLOUDFLARE_READ"] } };
  const clean = "# A comment\nSTRIPE_SECRET_KEY=\n# EXAMPLE_KEY=\n# WONG_CLOUDFLARE_READ=\n# WONG_ACCESS_LOGIN_MANAGEMENT=\n";
  expect(problems(clean, registry)).toEqual([]);
  expect(problems(`${clean}MAPS_KEY=\nexport OTHER_KEY = 1\n`, registry)).toEqual(["MAPS_KEY: in no key", "OTHER_KEY: in no key"]);
  // A key setup makes is never declared, so its commented name is held to the list too.
  expect(problems("# WONG_NEW_KEY=\n", registry)).toEqual(["WONG_NEW_KEY: in no key"]);
  expect(problems(clean, { ...registry, payments: { secrets: ["STRIPE_SECRET_KEY"] } })).toEqual(["STRIPE_SECRET_KEY: in stripe and payments"]);
});
