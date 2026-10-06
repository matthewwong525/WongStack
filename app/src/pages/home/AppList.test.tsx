// @vitest-environment jsdom

import { cleanup, fireEvent, render, screen, within } from "@testing-library/react";
import { afterEach, beforeEach, expect, it, vi } from "vitest";
import { AppList } from "./AppList";

const setup = { role: "employee", identity: { email: "person@example.com", subject: "person" }, apps: ["tips"], api: "authenticated",
  repository: "manual_provider_setup", memory: "independent_operator_setup", prompt: { state: "unavailable", message: "Finish reviewed setup" } };
const fetchMock = vi.fn(async () => Response.json(setup));
beforeEach(() => { fetchMock.mockClear(); vi.stubGlobal("fetch", fetchMock); });
afterEach(() => { cleanup(); vi.unstubAllGlobals(); });

const access = { name: "access", title: "Access", description: "Who can use what", href: "/apps/access/" };
const hello = { name: "hello", title: "Hello", description: "A small example you can try and change.", href: "/apps/hello/" };
const tips = { name: "tips", title: "Tips", description: "Split a bill with a tip", href: "/apps/tips/" };
const hrefs = () => screen.queryAllByRole("link").map((link) => link.getAttribute("href"));
// The Connect card, the greyed cards, and the one line that says who to ask.
const connect = () => screen.getByRole("button", { name: "Connect your assistant Use your apps from your own assistant." });
const greyed = () => screen.queryAllByRole("button").filter((card) => card.getAttribute("aria-disabled") === "true");
const asks = () => screen.queryAllByRole("status").map((line) => line.textContent);

it("shows each app as an accessible link and labels only Hello as an example", () => {
  render(<AppList apps={[hello, tips]} />);

  expect(hrefs()).toEqual(["/apps/hello/", "/apps/tips/"]);
  const helloLink = screen.getByRole("link", { name: "Hello Example A small example you can try and change." });
  const tipsLink = screen.getByRole("link", { name: "Tips Split a bill with a tip" });
  expect(within(helloLink).getByText("Example")).toBeTruthy();
  expect(within(tipsLink).queryByText("Example")).toBeNull();
  expect(screen.getAllByText("Example")).toHaveLength(1);
  // With no set of held apps, as for the employer and before permissions start, nothing is greyed.
  expect(greyed()).toEqual([]);
  expect(screen.queryByText("No access")).toBeNull();
});

it("says how to ask for an app when there are none, with the Connect card under it", () => {
  render(<AppList apps={[]} />);

  expect(screen.getByText("Your next tool starts with a request.")).toBeTruthy();
  expect(screen.getByText("Make me a tip calculator.").tagName).toBe("Q");
  expect(screen.getByText(/Ask in your chat:/)).toBeTruthy();
  expect(screen.queryAllByRole("link")).toEqual([]);
  expect(screen.getAllByRole("listitem")).toHaveLength(1);
  expect(connect()).toBeTruthy();
});

it("keeps a long app title and description together in its link", () => {
  const title = "A workspace tool with a very long title for the whole team";
  const description = "Review the next steps and notes from everyone working on the project together.";
  render(<AppList apps={[{ name: "team", title, description, href: "/apps/team/" }]} />);

  const link = screen.getByRole("link", { name: `${title} ${description}` });
  expect(link.getAttribute("href")).toBe("/apps/team/");
  expect(within(link).getByText(title)).toBeTruthy();
  expect(within(link).getByText(description)).toBeTruthy();
  expect(within(link).queryByText("Example")).toBeNull();
});

it("shows an app the person lacks greyed and labelled, and a press says who to ask without opening anything", () => {
  const payroll = { name: "payroll", title: "Payroll", description: "Pay the team", href: "/apps/payroll/" };
  render(<AppList apps={[access, hello, payroll, tips]} held={["access", "tips"]} />);

  // What they hold stays a link; what they lack is no link at all.
  expect(hrefs()).toEqual(["/apps/access/", "/apps/tips/"]);
  expect(screen.queryByText(/No business apps assigned/)).toBeNull();
  const lacked = screen.getByRole("button", { name: "Hello No access A small example you can try and change." }) as HTMLButtonElement;
  expect(greyed().map((card) => card.textContent)).toEqual([lacked.textContent, "Payroll No access Pay the team"]);
  // Marked by words in a bordered label, not by colour alone, and never labelled an example.
  const label = within(lacked).getByText("No access");
  expect([label.getAttribute("data-slot"), label.getAttribute("data-variant")]).toEqual(["badge", "outline"]);
  expect(within(lacked).queryByText("Example")).toBeNull();
  expect(lacked.className.split(" ")).toEqual(expect.arrayContaining(["text-muted-foreground", "cursor-not-allowed"]));
  expect(asks()).toEqual([]);

  // The keyboard reaches it: a real button that is told to assistive tools as unavailable, not switched off.
  expect([lacked.tagName, lacked.type, lacked.disabled, lacked.tabIndex]).toEqual(["BUTTON", "button", false, 0]);
  lacked.focus();
  expect(document.activeElement).toBe(lacked);
  fireEvent.click(lacked);
  expect(asks()).toEqual(["Ask your admin for access to Hello."]);
  // The line sits under its own card, and nothing was opened or sent.
  expect(lacked.closest("li")!.lastElementChild!.textContent).toBe("Ask your admin for access to Hello.");
  expect(hrefs()).toEqual(["/apps/access/", "/apps/tips/"]);
  expect(screen.queryByRole("dialog")).toBeNull();
  expect(fetchMock).not.toHaveBeenCalled();

  // It stays until another is picked.
  fireEvent.click(screen.getByRole("button", { name: "Payroll No access Pay the team" }));
  expect(asks()).toEqual(["Ask your admin for access to Payroll."]);
});

it("tells an employee with no business apps to contact their employer, above the greyed cards and the Connect card", () => {
  render(<AppList apps={[access, hello, tips]} held={["access"]} />);

  const line = screen.getByText("No business apps assigned. Contact your employer.");
  expect(line.nextElementSibling!.tagName).toBe("UL");
  expect(hrefs()).toEqual(["/apps/access/"]);
  expect(screen.queryByRole("link", { name: "Open your assistant setup" })).toBeNull();
  expect(greyed()).toHaveLength(2);
  expect(screen.queryByText("Your next tool starts with a request.")).toBeNull();
  expect(connect()).toBeTruthy();
  cleanup();
  // With no apps built at all, it is still theirs to ask the employer.
  render(<AppList apps={[]} held={[]} />);
  expect(screen.getByText("No business apps assigned. Contact your employer.")).toBeTruthy();
  expect(screen.queryByText("Your next tool starts with a request.")).toBeNull();
});

it("ends the list with a Connect card that opens the setup steps over the page and closes back to it", async () => {
  render(<AppList apps={[hello, tips]} held={["tips"]} />);

  // Last in the list, never greyed, and nothing is loaded until it is pressed.
  const card = connect();
  expect(screen.getAllByRole("listitem").at(-1)!.contains(card)).toBe(true);
  expect(card.getAttribute("aria-disabled")).toBeNull();
  expect([screen.queryByRole("dialog"), fetchMock.mock.calls.length]).toEqual([null, 0]);

  fireEvent.click(card);
  const popup = screen.getByRole("dialog", { name: "Connect your assistant" });
  // Setup is not ready here: the popup says what the app answered, with nothing to copy.
  await within(popup).findByText("Finish reviewed setup");
  expect(within(popup).queryByRole("button", { name: "Copy" })).toBeNull();

  fireEvent.click(within(popup).getByRole("button", { name: "Close" }));
  expect(screen.queryByRole("dialog")).toBeNull();
  expect(hrefs()).toEqual(["/apps/tips/"]);
  expect(connect()).toBeTruthy();
});

it("greys the Connect card for a person who lacks Project code: a press says who to ask and opens nothing", () => {
  render(<AppList apps={[hello, tips]} held={["hello", "tips"]} code="lacked" />);

  const card = screen.getByRole("button", { name: "Connect your assistant No access Use your apps from your own assistant." }) as HTMLButtonElement;
  expect(screen.getAllByRole("listitem").at(-1)!.contains(card)).toBe(true);
  expect(greyed()).toEqual([card]);
  // Marked by words in a bordered label, not by colour alone; the keyboard still reaches it.
  const label = within(card).getByText("No access");
  expect([label.getAttribute("data-slot"), label.getAttribute("data-variant")]).toEqual(["badge", "outline"]);
  expect(card.className.split(" ")).toEqual(expect.arrayContaining(["text-muted-foreground", "cursor-not-allowed"]));
  expect([card.tagName, card.type, card.disabled, card.tabIndex, asks()]).toEqual(["BUTTON", "button", false, 0, []]);
  card.focus();
  expect(document.activeElement).toBe(card);

  fireEvent.click(card);
  expect(asks()).toEqual(["Ask your admin for access to Connect your assistant."]);
  expect(card.closest("li")!.lastElementChild!.textContent).toBe("Ask your admin for access to Connect your assistant.");
  expect([screen.queryByRole("dialog"), fetchMock.mock.calls.length, hrefs()]).toEqual([null, 0, ["/apps/hello/", "/apps/tips/"]]);
});

it("keeps the Connect card open to press when the person may connect, and while the app can not hand the project out", () => {
  for (const code of ["ready", "off", undefined] as const) {
    render(<AppList apps={[hello]} code={code} />);
    expect([connect().getAttribute("aria-disabled"), greyed(), screen.queryByText("No access")], String(code)).toEqual([null, [], null]);
    fireEvent.click(connect());
    expect(screen.getByRole("dialog", { name: "Connect your assistant" })).toBeTruthy();
    cleanup();
  }
});
