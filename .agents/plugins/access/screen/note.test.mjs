// @vitest-environment jsdom
import { expect, it } from "vitest";
import { givesProject, mayConnect, welcomeNote } from "./note.mjs";

const roles = [{ id: "admin", name: "Admin", builtIn: true, apps: [], keys: {} },
  { id: "dev", name: "Dev", apps: [], keys: { code: "read" } }, { id: "sales", name: "Sales", apps: ["hello"], keys: { stripe: "read" } }];
const person = (changes = {}) => ({ email: "ann@example.com", role: null, keys: {}, ...changes });
const CONNECT = "Then open Connect your assistant and follow its steps.";
const lines = (project, changes = {}) => welcomeNote({ project, roles }, person(changes)).split("\n");

it("without a setup message, names the address and the sign-in email, and Connect your assistant only for a person who may connect", () => {
  const base = [`You can now use our company app at ${window.location.origin}`, "Sign in with ann@example.com."];
  // Their own set holds Project code.
  expect(lines("ready", { keys: { code: "read" } })).toEqual([...base, CONNECT]);
  expect(lines("ready", { keys: { code: "write" } })).toEqual([...base, CONNECT]);
  // Their role gives it, or is Admin, which gives everything.
  expect(lines("ready", { role: "dev" })).toEqual([...base, CONNECT]);
  expect(lines("ready", { role: "admin" })).toEqual([...base, CONNECT]);
  // An install not handing out its project lets everyone connect, and so does a project with no Project code step.
  for (const project of ["key", "setup", undefined]) expect(lines(project)).toEqual([...base, CONNECT]);
  // Without Project code, on an install handing it out: no Connect line. A role decides, not the person's old set.
  expect(lines("ready")).toEqual(base);
  expect(lines("ready", { role: "sales", keys: { code: "read" } })).toEqual(base);
  expect(mayConnect({ project: undefined, roles }, person())).toBe(true);
});

it("carries no key", () => {
  expect(welcomeNote({ project: "ready", roles }, person({ keys: { code: "write", stripe: "read" } }))).not.toMatch(/code|stripe|key/i);
});

it("carries the setup message unchanged, with install and sign-in steps, only for a person who may connect", () => {
  const MESSAGE = "Set up shop's project for me in this folder.\nThen tell me what works and what is left.";
  const note = welcomeNote({ project: "ready", roles }, person({ role: "dev" }), MESSAGE);
  expect(note.split("\n")).toEqual([`You can now use our company app at ${window.location.origin}`, "Sign in with ann@example.com.", "",
    "To connect your AI assistant:",
    "1. No assistant on your computer yet? Install one, such as Claude Code (https://claude.com/product/claude-code) or Codex (https://developers.openai.com/codex).",
    "2. Paste this whole note into its chat.", "3. When it shows a sign-in link, sign in with ann@example.com.", "", "For the assistant:", ...MESSAGE.split("\n")]);
  expect(note.endsWith(`\n${MESSAGE}`)).toBe(true);
  // A person who may not connect gets no message, even when the viewer has one.
  expect(welcomeNote({ project: "ready", roles }, person({ role: "sales" }), MESSAGE)).not.toContain(MESSAGE);
});

it("gives the project only on a save that newly lets a person connect, while the install hands it out", () => {
  const own = (changes = {}) => ({ status: "active", role: null, keys: {}, ...changes });
  const code = { role: null, keys: { code: "read" } };
  // A new person, a removed one, or one without it, given it by their own set or a role.
  expect([givesProject({ project: "ready", roles }, undefined, code), givesProject({ project: "ready", roles }, own({ status: "removed", keys: { code: "read" } }), code),
    givesProject({ project: "ready", roles }, own(), code), givesProject({ project: "ready", roles }, own({ role: "sales" }), { role: "dev", keys: {} })]).toEqual([true, true, true, true]);
  // Already holding it, a save without it, an install not handing it out, or no such step: nothing to send.
  expect([givesProject({ project: "ready", roles }, own({ role: "dev" }), code), givesProject({ project: "ready", roles }, undefined, { role: "sales", keys: {} }),
    givesProject({ project: "key", roles }, undefined, code), givesProject({ roles }, undefined, code)]).toEqual([false, false, false, false]);
});
