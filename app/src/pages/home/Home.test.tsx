// @vitest-environment jsdom

import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, beforeEach, expect, it, vi } from "vitest";
import { apps } from "../../lib/apps";
import { Home } from "./Home";

const setup = { role: "employee", identity: { email: "person@example.com", subject: "person" }, apps: apps.map((app) => app.name), api: "authenticated",
  repository: "manual_provider_setup", memory: "independent_operator_setup", prompt: { state: "unavailable", message: "Finish reviewed setup" } };
// What the app-access read answers; the setup read answers the same for everyone.
let access: unknown;
const answer = (value: unknown) => { access = value; };
beforeEach(() => {
  answer({ state: "legacy" });
  vi.stubGlobal("fetch", vi.fn(async (url: string) => {
    if (url.endsWith("/setup")) return Response.json(setup);
    if (access instanceof Promise) return access;
    return access === null ? Response.json({ code: "unavailable" }, { status: 503 }) : Response.json(access);
  }));
});
afterEach(() => { cleanup(); vi.unstubAllGlobals(); });

const every = apps.map((app) => app.name);
const hrefs = () => screen.queryAllByRole("link").map((link) => link.getAttribute("href"));
const connect = () => screen.queryByRole("button", { name: /^Connect your assistant/ });
const greyed = () => screen.queryAllByRole("button").filter((card) => card.getAttribute("aria-disabled") === "true").map((card) => card.textContent);
const steps = () => screen.queryByRole("region", { name: "Connect your assistant" });

it("lists every app in this build after safe app-access readback", async () => {
  render(<Home />);

  await screen.findByRole("region", { name: "Make it yours" });
  expect(hrefs()).toEqual(apps.map((app) => app.href));
  expect(greyed()).toEqual([]);
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
  // Each app is a link, and the Connect card ends the list.
  expect([list.tagName, list.querySelectorAll("li a").length, list.querySelectorAll("li").length]).toEqual(["UL", apps.length, apps.length + 1]);
  expect(list.lastElementChild!.contains(connect())).toBe(true);
});

it("has no setup box: the Connect card opens the steps over the page, and closing them leaves the page as it was", async () => {
  render(<Home />);

  await screen.findByRole("region", { name: "Make it yours" });
  expect([steps(), screen.queryByRole("dialog")]).toEqual([null, null]);
  fireEvent.click(connect()!);
  // An install with no recorded owner still offers everyone the steps.
  await screen.findByText("Signed in as person@example.com");
  expect(screen.getByRole("dialog", { name: "Connect your assistant" }).contains(steps())).toBe(true);
  fireEvent.click(screen.getByRole("button", { name: "Close" }));
  expect([steps(), screen.queryByRole("dialog")]).toEqual([null, null]);
  expect(screen.getByRole("heading", { level: 2, name: "Your apps" })).toBeTruthy();
  expect(hrefs()).toEqual(apps.map((app) => app.href));
});

it("the verified employer retains the welcome and the current app catalogue, with nothing greyed", async () => {
  answer({ state: "current", role: "owner", revision: 1, apps: every });
  render(<Home />);
  await screen.findByRole("region", { name: "Make it yours" });
  expect(hrefs()).toEqual(apps.map((app) => app.href));
  expect(greyed()).toEqual([]);
  cleanup();
  // An app the catalogue leaves out is not listed for the employer, greyed or otherwise.
  answer({ state: "current", role: "owner", revision: 1, apps: ["access"] });
  render(<Home />);
  await screen.findByRole("region", { name: "Make it yours" });
  expect(hrefs()).toEqual(["/apps/access/"]);
  expect(greyed()).toEqual([]);
  expect(connect()).toBeTruthy();
});

it("shows an employee the apps they hold as links and the rest greyed, once per-app permissions have started", async () => {
  answer({ state: "current", role: "employee", revision: 1, apps: ["access", "hello"] });
  render(<Home />);
  await screen.findByRole("link", { name: /^Hello Example/ });
  expect(hrefs()).toEqual(["/apps/access/", "/apps/hello/"]);
  const lacked = apps.filter((app) => !["access", "hello"].includes(app.name));
  expect(greyed()).toEqual(lacked.map((app) => `${app.title} No access ${app.description}`));
  expect(screen.queryByRole("region", { name: "Make it yours" })).toBeNull();
  expect(screen.queryByText(/No business apps assigned/)).toBeNull();
  fireEvent.click(screen.getByRole("button", { name: new RegExp(`^${lacked[0].title} No access`) }));
  expect(screen.getByRole("status").textContent).toBe(`Ask your admin for access to ${lacked[0].title}.`);
  expect(hrefs()).toEqual(["/apps/access/", "/apps/hello/"]);
  expect(connect()).toBeTruthy();
});

it("greys nothing before per-app permissions start: everyone holds every app", async () => {
  for (const role of ["employee", "owner"]) {
    answer({ state: "not_started", role, apps: ["access"] });
    render(<Home />);
    await screen.findByRole("region", { name: "Make it yours" });
    expect(hrefs()).toEqual(apps.map((app) => app.href));
    expect(greyed()).toEqual([]);
    expect(connect()).toBeTruthy();
    cleanup();
  }
});

it("withholds the whole list, the Connect card included, while app access is loading or unavailable", async () => {
  let arrive: (value: Response) => void = () => {};
  answer(new Promise<Response>((resolve) => { arrive = resolve; }));
  render(<Home />);
  expect(screen.getByRole("status").textContent).toBe("Loading your apps…");
  expect([hrefs(), connect(), screen.queryByRole("list")]).toEqual([[], null, null]);
  arrive(Response.json({ state: "legacy" }));
  await screen.findByRole("region", { name: "Make it yours" });
  expect(connect()).toBeTruthy();
  cleanup();

  answer(null);
  render(<Home />);
  expect((await screen.findByRole("alert")).textContent).toBe("Your app access is unavailable.");
  expect([hrefs(), connect(), screen.queryByRole("list"), greyed()]).toEqual([[], null, null, []]);
  answer({ state: "legacy" });
  fireEvent.click(screen.getByRole("button", { name: "Retry apps" }));
  await screen.findByRole("region", { name: "Make it yours" });
  expect(hrefs()).toEqual(apps.map((app) => app.href));
});
