// install.ts: the sentences it builds, the two ways to install with their costs, and that every link is secure.
/// <reference types="node" />
import { existsSync } from "node:fs";
import { resolve } from "node:path";
import { expect, it } from "vitest";
import {
  ACCOUNTS,
  PASEO,
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
} from "./install";

it("names computers the way a sentence does, for one, two, or three", () => {
  expect(computers(["One"])).toBe("One");
  expect(computers(["One", "Two"])).toBe("One and Two");
  expect(computers(["One", "Two", "Three"])).toBe("One, Two, and Three");
});

it("names its own computers and accounts when given none", () => {
  expect(COMPUTERS.length).toBeGreaterThan(0);
  expect(ACCOUNTS.length).toBeGreaterThan(0);
  for (const name of COMPUTERS) expect(computers()).toContain(name);
  for (const { name } of ACCOUNTS) expect(WAYS[0]?.line).toContain(name);
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

it("links the code, every agent, every account, and the optional app to a secure address", () => {
  const links = [REPO_URL, PASEO.href, ...[...AGENTS, ...ACCOUNTS].map(({ href }) => href)];

  expect(links.length).toBeGreaterThan(3);
  for (const link of links) expect(link).toMatch(/^https:\/\/[a-z0-9.-]+(\/\S*)?$/);
});

it("opens the first step with any assistant, and names one only as a linked example", () => {
  expect(STEPS.open).toBe("Open any assistant that can work on your computer, such as");
  expect(Object.keys(STEPS)).toEqual(["open", "paste", "answer"]);
  const named = [...AGENTS, PASEO].map(({ name }) => name);
  expect(named.length).toBeGreaterThan(2);
  for (const text of Object.values(STEPS)) {
    for (const name of named) expect([text, name, text.includes(name)]).toEqual([text, name, false]);
  }
});

it("gives two ways to install, the GitHub one first, each line naming its own accounts and the paid plan's cost", () => {
  expect(WAYS.map((way) => [way.name, way.accounts, way.computers, way.cost])).toEqual([
    ["With GitHub", ["GitHub", "Cloudflare"], ["Mac", "Windows", "Linux"], "about $5 a month"],
    ["Cloudflare alone", ["Cloudflare"], ["Mac", "Linux"], "about $5 a month"],
  ]);
  expect(WAYS.map((way) => way.line)).toEqual([
    "With GitHub, on Mac, Windows, or Linux: your project is kept in a GitHub account, and your apps run on Cloudflare's paid plan, about $5 a month.",
    "Or keep everything in Cloudflare alone, on Mac or Linux: Cloudflare's paid plan, about $5 a month.",
  ]);
  for (const way of WAYS) {
    for (const account of way.accounts) expect([way.name, account, way.line.includes(account)]).toEqual([way.name, account, true]);
    expect([way.name, way.line.toLowerCase().includes(way.cost)]).toEqual([way.name, true]);
    // No way to install is called free: every way needs the paid plan.
    expect([way.name, /\bfree\b/i.test(way.line)]).toEqual([way.name, false]);
  }
});

it("builds the ways from the accounts and computers the rest of the page names", () => {
  const [github, alone] = WAYS;

  // The GitHub way is the one the "built on" list describes.
  expect(github?.accounts).toEqual(ACCOUNTS.map((account) => account.name));
  expect(github?.computers).toEqual(COMPUTERS);
  // Both ways cost the same; the other needs fewer accounts and works on fewer computers, never others.
  expect(github?.cost).toBe(PAID_COST);
  expect(alone?.cost).toBe(PAID_COST);
  expect(alone?.accounts).toHaveLength(1);
  expect(alone?.computers).toHaveLength(2);
  for (const account of alone?.accounts ?? []) expect(github?.accounts).toContain(account);
  for (const computer of alone?.computers ?? []) expect(COMPUTERS).toContain(computer);
  expect(alone?.line).toContain(alone?.computers.join(" or "));
});

it("lists every sentence that speaks of a cost: each way's line, that setup checks the plan first, and what two answers add", () => {
  expect(ASKS_FIRST).toBe("Setup checks for Cloudflare's paid plan before it makes anything.");
  expect(COST_ANSWERS).toEqual({
    free: "Every way to install needs Cloudflare's paid plan, about $5 a month.",
    cost: "Every install also needs Cloudflare's paid plan, about $5 a month.",
  });
  expect(COST_LINES).toEqual([WAYS[0]?.line, WAYS[1]?.line, ASKS_FIRST, COST_ANSWERS.free, COST_ANSWERS.cost]);
  // One figure, said the same way wherever a price is named, and no cost line calls an install free.
  for (const line of COST_LINES.filter((line) => line.includes("$"))) expect(line).toContain(PAID_COST);
  expect(COST_LINES.filter((line) => line.includes(PAID_COST))).toHaveLength(4);
  for (const line of COST_LINES) expect([line, /\bfree\b/i.test(line)]).toEqual([line, false]);
});
