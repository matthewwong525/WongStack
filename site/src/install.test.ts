// install.ts: the sentences it builds, and that every link in it is a secure address.
import { expect, it } from "vitest";
import { ACCOUNTS, ADD_ONS, AGENTS, COMPUTERS, REPO_URL, STEPS, computers, freeAccounts } from "./install";

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
