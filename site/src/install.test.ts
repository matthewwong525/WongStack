// install.ts: the sentences it builds, the two ways to install and what each costs, and that every link in it is a secure address.
/// <reference types="node" />
import { existsSync } from "node:fs";
import { resolve } from "node:path";
import { expect, it } from "vitest";
import {
  ACCOUNTS,
  ADD_ONS,
  AGENTS,
  ASKS_FIRST,
  COMPUTERS,
  COST_ANSWERS,
  COST_LINES,
  PAID_COST,
  REPO_URL,
  STEPS,
  WAYS,
  agents,
  computers,
  freeAccounts,
} from "./install";

it("names computers and accounts the way a sentence does, for one, two, or three", () => {
  expect(computers(["One"])).toBe("One");
  expect(computers(["One", "Two"])).toBe("One and Two");
  expect(computers(["One", "Two", "Three"])).toBe("One, Two, and Three");
  expect(freeAccounts(["One"])).toBe("a free One account");
  expect(freeAccounts(["One", "Two"])).toBe("free One and Two accounts");
  expect(freeAccounts(["One", "Two", "Three"])).toBe("free One, Two, and Three accounts");
});

it("names its own computers and accounts when given none", () => {
  expect(COMPUTERS.length).toBeGreaterThan(0);
  expect(ACCOUNTS.length).toBeGreaterThan(0);
  for (const name of COMPUTERS) expect(computers()).toContain(name);
  for (const { name } of ACCOUNTS) expect(freeAccounts()).toContain(name);
});

it("gives every agent and account a logo file that exists under public/logos/", () => {
  const logos = [...AGENTS, ...ACCOUNTS].map(({ name, logo }) => [name, logo]);

  expect(AGENTS.map(({ name, logo }) => [name, logo])).toEqual([
    ["Claude Code", "claude"],
    ["Codex", "openai"],
  ]);
  for (const [name, logo] of logos) {
    expect([name, logo, existsSync(resolve(import.meta.dirname, "../public/logos", `${logo}.svg`))]).toEqual([name, logo, true]);
  }
});

it("names the agents the way the headline's sentence does, for one, two, or three", () => {
  expect(agents(["One"])).toBe("One");
  expect(agents(["One", "Two"])).toBe("One or Two");
  expect(agents(["One", "Two", "Three"])).toBe("One, Two, or Three");
  expect(agents()).toBe("Claude Code or Codex");
});

it("links the code, every agent, every account, and every add-on to a secure address", () => {
  const links = [REPO_URL, ...[...AGENTS, ...ACCOUNTS, ...ADD_ONS].map(({ href }) => href)];

  expect(links.length).toBeGreaterThan(3);
  for (const link of links) expect(link).toMatch(/^https:\/\/[a-z0-9.-]+(\/\S*)?$/);
});

it("opens the first step with any assistant, and names one only as a linked example", () => {
  expect(STEPS.open).toBe("Open any assistant that can work on your computer, such as");
  expect(Object.keys(STEPS)).toEqual(["open", "paste", "answer"]);
  const named = [...AGENTS, ...ADD_ONS].map(({ name }) => name.replace(/^Add /, ""));
  expect(named.length).toBeGreaterThan(2);
  for (const text of Object.values(STEPS)) {
    for (const name of named) expect([text, name, text.includes(name)]).toEqual([text, name, false]);
  }
});

it("gives two ways to install, the free one first, each line naming its own accounts and cost", () => {
  expect(WAYS.map((way) => [way.name, way.accounts, way.computers, way.cost])).toEqual([
    ["Free", ["GitHub", "Cloudflare"], ["Mac", "Windows", "Linux"], "free"],
    ["Cloudflare alone", ["Cloudflare"], ["Mac", "Linux"], "about $5 a month"],
  ]);
  expect(WAYS.map((way) => way.line)).toEqual([
    "Free: your project is kept in a free GitHub account, and your apps run in a free Cloudflare account.",
    "Or keep everything in Cloudflare alone, on Mac or Linux: Cloudflare's paid plan, about $5 a month.",
  ]);
  for (const way of WAYS) {
    for (const account of way.accounts) expect([way.name, account, way.line.includes(account)]).toEqual([way.name, account, true]);
    expect([way.name, way.line.toLowerCase().includes(way.cost)]).toEqual([way.name, true]);
  }
});

it("builds the ways from the accounts and computers the rest of the page names", () => {
  const [free, alone] = WAYS;

  // The free way is the one the "built on" list and the first answer describe.
  expect(free?.accounts).toEqual(ACCOUNTS.map((account) => account.name));
  expect(free?.computers).toEqual(COMPUTERS);
  // The paid way needs fewer accounts and works on fewer computers, never others.
  expect(alone?.cost).toBe(PAID_COST);
  expect(alone?.accounts).toHaveLength(1);
  expect(alone?.computers).toHaveLength(2);
  for (const account of alone?.accounts ?? []) expect(free?.accounts).toContain(account);
  for (const computer of alone?.computers ?? []) expect(COMPUTERS).toContain(computer);
  expect(alone?.line).toContain(alone?.computers.join(" or "));
});

it("lists every sentence that speaks of a cost: the paid way's line, that setup asks first, and what two answers add", () => {
  expect(ASKS_FIRST).toBe("On Mac or Linux, setup asks which you want before anything costs money.");
  expect(COST_ANSWERS).toEqual({
    free: "On Mac or Linux you can keep everything in Cloudflare alone instead, on Cloudflare's paid plan, about $5 a month.",
    cost: "Cloudflare's paid plan, about $5 a month, is needed only to keep everything in Cloudflare alone or to run jobs on a schedule.",
  });
  expect(COST_LINES).toEqual([WAYS[1]?.line, ASKS_FIRST, COST_ANSWERS.free, COST_ANSWERS.cost]);
  // The free way's line names no price, so it needs no allowance.
  expect(COST_LINES).not.toContain(WAYS[0]?.line);
  // One figure, said the same way wherever a price is named.
  for (const line of COST_LINES.filter((line) => line.includes("$"))) expect(line).toContain(PAID_COST);
  expect(COST_LINES.filter((line) => line.includes(PAID_COST))).toHaveLength(3);
});
