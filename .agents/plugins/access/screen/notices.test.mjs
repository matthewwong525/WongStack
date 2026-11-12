// @vitest-environment jsdom
import { afterEach, expect, it } from "vitest";
import { VIEWS } from "./address.mjs";
import { Notices } from "./notices.mjs";
import { cleanup, renderPart, screen } from "./test-dom.mjs";
import { html } from "./vendor/preact-htm.mjs";

// An owner's People view on the live app, where the first open could not read the sign-in list.
const status = (startError, changes = {}) => ({ ownerEmail: "owner@example.com", viewer: { email: "owner@example.com", owner: true },
  environment: "live", key: "ready", started: false, startError, imported: 0, keysStarted: false, unticked: { people: [], roles: [] },
  apps: [], keys: [], roles: [], people: [], work: [], project: "ready", ...changes });
const show = (startError, changes) => renderPart(html`<${Notices} status=${status(startError, changes)} id="" view=${VIEWS[0]}
  pending=${false} save=${() => {}} reload=${() => {}} />`);
const why = () => screen.queryByText(/^Why:/)?.textContent;
afterEach(cleanup);

it("says why the sign-in list could not be read, in plain words with the code beside them, inside the same notice", async () => {
  await show("login_policy_review_required");
  expect(why()).toBe("Why: The sign-in list has a rule this app does not manage, so a person must check it. (login_policy_review_required)");
  expect(screen.getByText(/^Why:/).closest("[data-slot='alert']").textContent).toMatch(/could not be read yet.*Read it again/);
});

it("reads a code it does not know as an odd answer, still with its code, and shows no line without one", async () => {
  await show("login_policy_unreadable");
  expect(why()).toBe("Why: Cloudflare's answer was not in a shape this app reads. (login_policy_unreadable)");
  cleanup(); await show(null);
  expect([!!screen.getByText(/could not be read yet/), why()]).toEqual([true, undefined]);
});

it("shows no sign-in step and no unticked notice for a project with neither a sign-in list nor apps", async () => {
  const container = await show("login_policy_unreadable", { key: undefined, apps: undefined, unticked: { people: [{ email: "kim@example.com", apps: ["Orders"] }], roles: [] } });
  expect([screen.queryByText(/could not be read yet/), screen.queryByText(/Unticked in this update/), container.textContent]).toEqual([null, null, ""]);
});
