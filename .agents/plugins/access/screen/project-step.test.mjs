// @vitest-environment jsdom
import { afterEach, beforeEach, expect, it, vi } from "vitest";
import { ProjectStep } from "./project-step.mjs";
import { FINISH_REQUEST, PROJECT_REQUEST, SAVE_REQUEST } from "./status.mjs";
import { cleanup, fireEvent, renderPart, screen, waitFor } from "./test-dom.mjs";
import { html } from "./vendor/preact-htm.mjs";

const status = (project, owner = true, projectSave) => ({ ownerEmail: "owner@shop.com", viewer: { email: owner ? "owner@shop.com" : "kim@shop.com", owner },
  environment: "live", key: "ready", started: true, imported: 0, keysStarted: true, unticked: { people: [], roles: [] }, apps: [], keys: [], roles: [], people: [], work: [], project, projectSave });
const show = (...args) => renderPart(html`<${ProjectStep} status=${status(...args)} />`);
beforeEach(() => Object.defineProperty(navigator, "clipboard", { configurable: true, value: { writeText: vi.fn(async () => {}) } }));
afterEach(() => { cleanup(); vi.restoreAllMocks(); });
const copies = async request => {
  await fireEvent.click(screen.getByRole("button", { name: "Copy that request" }));
  await waitFor(() => expect(navigator.clipboard.writeText).toHaveBeenCalledWith(request));
};

it("says nothing once the app can hand the project out, or where the project has no such step", async () => {
  expect((await show("ready")).textContent).toBe(""); cleanup();
  expect((await show("ready", false)).textContent).toBe(""); cleanup();
  // Handed out and saved to: nothing either, for the owner or an Admin.
  for (const owner of [true, false]) { expect((await show("ready", owner, "ready")).textContent).toBe(""); cleanup(); }
  expect((await show(undefined)).textContent).toBe("");
});
it("asks for one step at a time: the install step alone while the project can not be handed out", async () => {
  const container = await show("key", true, "key");
  expect(container.textContent).toMatch(/^One step first\./); expect(container.textContent).not.toMatch(/Saving/);
  expect(screen.getAllByRole("button")).toHaveLength(1);
});
it("tells the owner whose app holds only the older key that saving needs one more step, with its own request to copy", async () => {
  const container = await show("ready", true, "key");
  expect(container.querySelector("p").textContent).toBe("Saving needs one more step. People can install the project now. To let them save changes, the app needs a newer GitHub key. Ask your assistant: Let teammates save changes");
  await copies(SAVE_REQUEST);
  expect(SAVE_REQUEST).toMatch(/^Let teammates save changes: .*WONG_CODE_WRITE.*wiki\/stack\/employee-project\.md/);
});
it("sends the owner of a Cloudflare-kept project that can not save yet to finish Access setup", async () => {
  const container = await show("ready", true, "setup");
  expect(container.querySelector("p").textContent).toBe("Saving needs one more step. People can install the project now. To let them save changes, ask your assistant: Finish Access setup");
  expect(container.textContent).not.toMatch(/GitHub/);
  await copies(FINISH_REQUEST);
});
it("tells an Admin the save step is the owner's, with nothing to copy", async () => {
  expect((await show("ready", false, "key")).textContent).toBe("Saving needs one more step for the owner. owner@shop.com adds a GitHub key."); cleanup();
  expect((await show("ready", false, "setup")).textContent).toBe("Saving needs one more step for the owner. owner@shop.com finishes Access setup.");
  expect(screen.queryByRole("button")).toBeNull();
});
it("asks the owner for the GitHub key, with the words to say and the whole request to copy", async () => {
  const container = await show("key");
  expect(container.querySelector("p").textContent).toBe("One step first. The app needs a GitHub key to hand the project out. Ask your assistant: Let teammates install the project");
  expect(screen.getByText("Let teammates install the project").tagName).toBe("Q");
  await copies(PROJECT_REQUEST);
  // The request names the key and the page that owns the steps, and repeats none of them.
  expect(PROJECT_REQUEST).toMatch(/^Let teammates install the project: .*WONG_CODE_WRITE.*wiki\/stack\/employee-project\.md/);
});
it("tells an Admin the GitHub key is the owner's step, with nothing to copy", async () => {
  expect((await show("key", false)).textContent).toBe("One step first for the owner. owner@shop.com adds a GitHub key.");
  expect(screen.queryByRole("button")).toBeNull();
});
it("sends the owner of an install with no project recorded to finish Access setup, never to make a GitHub key", async () => {
  const container = await show("setup");
  expect(container.querySelector("p").textContent).toBe("One step first. The app does not know which project to hand out yet. Ask your assistant: Finish Access setup");
  expect(container.textContent).not.toMatch(/GitHub/);
  await copies(FINISH_REQUEST);
});
it("on a preview, says the project is the live app's alone, with no step for the owner or an Admin", async () => {
  for (const owner of [true, false]) {
    expect((await show("live", owner, "live")).textContent).toBe("Live app only. People install the project and save changes from the live app.");
    expect(screen.queryByRole("button")).toBeNull(); cleanup();
  }
});
it("tells an Admin that finishing Access setup is the owner's step, with nothing to copy", async () => {
  expect((await show("setup", false)).textContent).toBe("One step first for the owner. owner@shop.com finishes Access setup.");
  expect(screen.queryByRole("button")).toBeNull();
});
