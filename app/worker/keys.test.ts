import { readFileSync } from "node:fs";
import { expect, it } from "vitest";
import { keys } from "./keys";

// The core's own key for the sign-in list is no business key: no route lists it and Access shows no level for it.
const CORE = ["WONG_ACCESS_LOGIN_MANAGEMENT"];
type Registry = Record<string, { secrets: readonly string[] }>;
type Described = Record<string, { purpose?: string; docs?: string; forward?: object }>;

/** Each key with no one-line purpose, or used directly with no HTTPS API guide, named. */
const undescribed = (registry: Described) => Object.entries(registry).flatMap(([id, key]) => [
  ...(!key.purpose?.trim() || key.purpose.length > 80 || /\n/.test(key.purpose) ? [`${id}: needs a purpose of one line, at most 80 characters`] : []),
  ...(key.docs !== undefined && !/^https:\/\/[^\s]+$/.test(key.docs) ? [`${id}: docs must be an HTTPS address`] : []),
  ...(key.forward && key.docs === undefined ? [`${id}: a key used directly needs docs, the service's API guide`] : []),
]);

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
  expect(keys.cloudflare).toMatchObject({ title: "Cloudflare", secrets: ["WONG_CLOUDFLARE_READ"], levels: ["read"], setup: true });
  // Neither the look-up key nor Project code may reach a preview, where branch code runs.
  expect([keys.cloudflare.liveOnly, keys.code.liveOnly]).toEqual([true, true]);
  // Project code is declared, so its key link can be sent, and it covers both of its names.
  for (const name of [/^WONG_CODE_READ=$/m, /^WONG_CODE_WRITE=$/m]) expect(readFileSync(new URL("../.dev.vars.example", import.meta.url), "utf8")).toMatch(name);
  expect(keys.code.secrets).toEqual(["WONG_CODE_READ", "WONG_CODE_WRITE"]);
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

it("every key says what it is for, and a key used directly links its service's API guide", () => {
  expect(undescribed(keys)).toEqual([]);
  expect(keys.cloudflare.docs).toBe("https://developers.cloudflare.com/api/");
  expect(undescribed({ stripe: {}, blank: { purpose: " " }, long: { purpose: "x".repeat(81) }, two: { purpose: "a\nb" } })).toEqual([
    "stripe: needs a purpose of one line, at most 80 characters", "blank: needs a purpose of one line, at most 80 characters",
    "long: needs a purpose of one line, at most 80 characters", "two: needs a purpose of one line, at most 80 characters"]);
  expect(undescribed({ notion: { purpose: "Team notes", forward: {} } })).toEqual(["notion: a key used directly needs docs, the service's API guide"]);
  expect(undescribed({ notion: { purpose: "Team notes", forward: {}, docs: "http://developers.notion.com" } })).toEqual(["notion: docs must be an HTTPS address"]);
  expect(undescribed({ notion: { purpose: "Team notes", forward: {}, docs: "https://developers.notion.com/reference" } })).toEqual([]);
});
