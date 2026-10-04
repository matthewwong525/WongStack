// @vitest-environment jsdom

import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, beforeEach, expect, it, vi } from "vitest";
import { apps } from "../../lib/apps";
import { Home } from "./Home";

const setup = { role: "employee", identity: { email: "person@example.com", subject: "person" }, apps: apps.map((app) => app.name), api: "authenticated",
  repository: "manual_provider_setup", memory: "independent_operator_setup", prompt: { state: "unavailable", message: "Finish reviewed setup" } };
beforeEach(() => vi.stubGlobal("fetch", vi.fn(async (url: string) => Response.json(url.endsWith("/setup") ? setup : { state: "legacy" }))));
afterEach(() => { cleanup(); vi.unstubAllGlobals(); });

it("lists every app in this build after safe app-access readback", async () => {
  render(<Home />);

  await screen.findByRole("region", { name: "Make it yours" });
  expect(screen.queryAllByRole("link").map((link) => link.getAttribute("href"))).toEqual(apps.map((app) => app.href));
  // An install with no recorded owner still offers everyone the setup box.
  await screen.findByText("Signed in as person@example.com");
  expect(screen.queryByText(/Loading/)).toBeNull();
});

it("keeps the workspace heading and apps outside the removable welcome, in order", async () => {
  render(<Home />);

  await screen.findByRole("region", { name: "Make it yours" });
  const heading = screen.getByRole("heading", { level: 1, name: "Your workspace, shaped around you" });
  const tutorial = screen.getByRole("region", { name: "Make it yours" });
  const appHeading = screen.getByRole("heading", { level: 2, name: "Your apps" });
  const list = appHeading.nextElementSibling!;
  expect(screen.getByText("Your tools, in one place.")).toBeTruthy();
  expect(heading.compareDocumentPosition(tutorial)).toBe(Node.DOCUMENT_POSITION_FOLLOWING);
  expect(tutorial.compareDocumentPosition(appHeading)).toBe(Node.DOCUMENT_POSITION_FOLLOWING);
  expect(tutorial.contains(heading)).toBe(false);
  expect(tutorial.contains(appHeading)).toBe(false);
  expect(tutorial.contains(list)).toBe(false);
  expect(list.className).toMatch(/^app-list/);
});

it('the verified employer retains the welcome and the current app catalogue', async () => {
  vi.stubGlobal('fetch', vi.fn(async (url: string) => url.endsWith('/apps')
    ? Response.json({ state: 'current', role: 'owner', revision: 1, apps: apps.map(app => app.name) })
    : Response.json({ ...setup, role: 'owner' })))
  render(<Home />)
  await screen.findByRole('region', { name: 'Make it yours' })
  expect(screen.getAllByRole('link').map(link => link.getAttribute('href'))).toEqual(apps.map(app => app.href))
  await screen.findByText('Finish reviewed setup')
})
