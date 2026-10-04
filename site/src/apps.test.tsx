// @vitest-environment jsdom

import { cleanup, fireEvent, render, screen, within } from "@testing-library/react";
import { afterEach, beforeEach, expect, it, vi } from "vitest";
import { YourApps } from "./apps";

const fetchMock = vi.fn();

beforeEach(() => {
  vi.stubGlobal("fetch", fetchMock);
  render(<YourApps />);
});

afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
  expect(fetchMock).not.toHaveBeenCalled();
  expect(localStorage).toHaveLength(0);
  expect(sessionStorage).toHaveLength(0);
});

const press = (name: string) => fireEvent.click(screen.getByRole("button", { name }));
const app = (name: string) => screen.getByRole("region", { name: `${name} app, sample data` });
const button = (name: string) => screen.getByRole("button", { name }) as HTMLButtonElement;
const pressed = (chips: Element) =>
  [...chips.querySelectorAll("button")].map((chip) => [chip.textContent, chip.getAttribute("aria-pressed")]);
/** A table's rows, header first, as cell texts. */
const table = (region: HTMLElement, n = 0) =>
  [...(region.querySelectorAll("table")[n] as HTMLTableElement).rows].map((row) => [...row.cells].map((cell) => cell.textContent));
const badges = (region: HTMLElement) => [...region.querySelectorAll(".badge")].map((badge) => [badge.textContent, badge.className]);

const APPS = [
  ["Pack Station", "Pack Station", "your-app.your-name.workers.dev/pack-station", "Our warehouse team packs every order with it."],
  ["Profit by channel", "Monthly Actuals", "your-app.your-name.workers.dev/monthly-actuals", "I check it every morning, before I decide where to spend on ads."],
  [
    "Ad briefs",
    "Ad briefs",
    "your-app.your-name.workers.dev/briefs",
    "I write a brief once. The designer works from it, and the finished ad goes out to Facebook and Instagram.",
  ],
];

it("offers three examples, one pressed at a time, each a sample Claymoo screen in its own browser window", () => {
  const section = screen.getByRole("heading", { level: 2, name: "Examples of things I've done" }).closest("section") as HTMLElement;

  within(section).getByText(
    "I run Claymoo, a clay-kit company, with a small team. These are three apps we use every day, built by asking. Try one.",
  );
  expect(pressed(section.querySelector(".chips") as HTMLElement)).toEqual([
    ["Pack Station", "true"],
    ["Profit by channel", "false"],
    ["Ad briefs", "false"],
  ]);
  for (const [name, title, address, use] of APPS as [string, string, string, string][]) {
    press(name);
    expect(pressed(section.querySelector(".chips") as HTMLElement).filter(([, on]) => on === "true")).toEqual([[name, "true"]]);
    expect(section.textContent).toContain(`${name}. ${use}`);
    const window = app(name);
    expect(window.parentElement).toBe(section);
    expect(window.querySelector(".browser-bar")?.textContent).toBe(address);
    expect(window.querySelector(".admin-head")?.textContent).toBe("CClaymoo AdminDocsSign out");
    within(window).getByRole("heading", { level: 3, name: title });
    expect(window.nextElementSibling?.textContent).toBe("Sample data. Nothing is saved.");
    expect(section).toMatchSnapshot(name);
  }
});

it("packs an order: scan every item, then Complete, and the list shows it packed", () => {
  const pack = app("Pack Station");
  const filters = () => pressed(pack.querySelector(".chips") as HTMLElement);

  within(pack).getByRole("textbox", { name: "Scan packing slip" });
  expect(filters()).toEqual([
    ["To Pack (3)", "false"],
    ["Packed (0)", "false"],
    ["All (3)", "true"],
  ]);
  expect(table(pack)).toEqual([
    ["Order #", "Pack by", "Items", "Delivery", "Status"],
    ["#1041", "Today", "2", "Express", "To pack"],
    ["#1042", "Today", "2", "Standard", "To pack"],
    ["#1043", "Tomorrow", "1", "Standard", "To pack"],
  ]);
  press("#1041");
  expect(within(pack).queryByRole("table")).toBeNull();
  expect(pack.querySelector(".admin-title")?.textContent).toBe("#1041 Scanned: 0/2 2 remaining");
  within(pack).getByText("Toronto, ON");
  within(pack).getByText("0.8 kg");
  const cow = button("Scan Cow clay kit: 0 of 1");
  expect(button("Complete").disabled).toBe(true);
  expect(pack.querySelector(".pack-items")).toMatchSnapshot("before scanning");
  fireEvent.click(cow);
  expect(cow.textContent).toBe("Cow clay kit SKU: CK-COW1/1 ✓");
  expect(cow.getAttribute("aria-label")).toBe("Scan Cow clay kit: 1 of 1");
  expect(cow.disabled).toBe(true);
  expect(pack.querySelector(".admin-title")?.textContent).toBe("#1041 Scanned: 1/2 1 remaining");
  expect(button("Complete").disabled).toBe(true);
  press("Scan Sculpting tools: 0 of 1");
  expect(pack.querySelector(".admin-title")?.textContent).toBe("#1041 Scanned: 2/2 0 remaining");
  expect(pack.querySelector(".pack-items")).toMatchSnapshot("all scanned");
  press("Complete");
  expect(table(pack)[1]).toEqual(["#1041", "Today", "2", "Express", "Packed"]);
  expect(within(pack).queryByRole("button", { name: "#1041" })).toBeNull();
  expect(badges(pack)).toEqual([
    ["Packed", "badge badge-dark"],
    ["To pack", "badge"],
    ["To pack", "badge"],
  ]);
  expect(filters()).toEqual([
    ["To Pack (2)", "false"],
    ["Packed (1)", "false"],
    ["All (3)", "true"],
  ]);
  press("To Pack (2)");
  expect(table(pack).map(([order]) => order)).toEqual(["Order #", "#1042", "#1043"]);
  press("Packed (1)");
  expect(table(pack).map(([order]) => order)).toEqual(["Order #", "#1041"]);
});

it("starts packing at the next open order, shows each SKU, goes back without saving scans, and stops when all are packed", () => {
  const pack = app("Pack Station");
  const title = () => pack.querySelector(".admin-title")?.textContent;

  press("Start Packing");
  expect(title()).toBe("#1041 Scanned: 0/2 2 remaining");
  press("Scan Cow clay kit: 0 of 1");
  press("← Order list");
  press("#1041");
  expect(title()).toBe("#1041 Scanned: 0/2 2 remaining");
  press("Scan Cow clay kit: 0 of 1");
  press("Scan Sculpting tools: 0 of 1");
  press("Complete");
  press("Start Packing");
  expect(title()).toBe("#1042 Scanned: 0/2 2 remaining");
  within(pack).getByText("Austin, TX");
  within(pack).getByText("1.1 kg");
  const frog = button("Scan Frog clay kit: 0 of 2");
  fireEvent.click(frog);
  expect(frog.textContent).toBe("Frog clay kit SKU: CK-FROG1/2");
  expect(frog.className).toBe("pack-item");
  expect(button("Complete").disabled).toBe(true);
  fireEvent.click(frog);
  expect(frog.className).toBe("pack-item pack-done");
  press("Complete");
  press("#1043");
  within(pack).getByText("Vancouver, BC");
  expect(button("Scan Mushroom clay kit: 0 of 1").textContent).toBe("Mushroom clay kit SKU: CK-MUSH0/1");
  press("Scan Mushroom clay kit: 0 of 1");
  press("Complete");
  expect(button("Start Packing").disabled).toBe(true);
  expect(table(pack).slice(1).map((row) => row[4])).toEqual(["Packed", "Packed", "Packed"]);
});

it("switches channels: tiles, cost lines, and bars follow, with profit = price − costs", () => {
  press("Profit by channel");
  const profit = app("Profit by channel");
  const tiles = () => [...profit.querySelectorAll(".admin-tiles div")].map((tile) => tile.textContent);
  const bars = () =>
    [...profit.querySelectorAll(".admin-bars li")].map((li) => [li.textContent, (li.querySelector("i") as HTMLElement).style.height]);

  within(profit).getByText("Mar 2026");
  within(profit).getByRole("heading", { level: 4, name: "Contribution margin — last 6 months" });
  expect(pressed(profit.querySelector(".chips") as HTMLElement)).toEqual([
    ["Shopify DTC", "true"],
    ["Faire", "false"],
    ["Amazon", "false"],
  ]);
  within(profit).getByRole("heading", { level: 4, name: "Shopify DTC · Mar 2026" });
  expect(tiles()).toEqual(["Unit cost$34.50", "Profit / kit$13.50", "Margin28%", "Breakeven CAC$27.50", "Breakeven ROAS1.75x"]);
  expect(table(profit)).toEqual([
    ["Line", "$ / kit"],
    ["Price", "$48.00"],
    ["Product cost", "$11.50"],
    ["Shipping + fees", "$9.00"],
    ["Ads", "$14.00"],
    ["Profit", "$13.50"],
  ]);
  expect(bars()).toEqual([
    ["$9.1kOct", "61%"],
    ["$10.2kNov", "69%"],
    ["$14.8kDec", "100%"],
    ["$11.0kJan", "74%"],
    ["$9.7kFeb", "66%"],
    ["$12.4kMar", "84%"],
  ]);
  press("Faire");
  within(profit).getByRole("heading", { level: 4, name: "Faire · Mar 2026" });
  expect(tiles()).toEqual(["Unit cost$14.50", "Profit / kit$11.50", "Margin44%", "Breakeven CAC$11.50", "Breakeven ROAS2.26x"]);
  expect(table(profit).slice(1)).toEqual([
    ["Price", "$26.00"],
    ["Product cost", "$11.50"],
    ["Shipping + fees", "$3.00"],
    ["Ads", "$0.00"],
    ["Profit", "$11.50"],
  ]);
  expect(bars().map(([label]) => label)).toEqual(["$2.1kOct", "$2.6kNov", "$3.9kDec", "$1.8kJan", "$2.0kFeb", "$2.4kMar"]);
  press("Amazon");
  expect(pressed(profit.querySelector(".chips") as HTMLElement)[0]).toEqual(["Shopify DTC", "false"]);
  expect(tiles()).toEqual(["Unit cost$33.00", "Profit / kit$11.00", "Margin25%", "Breakeven CAC$17.00", "Breakeven ROAS2.59x"]);
  expect(table(profit).slice(1)).toEqual([
    ["Price", "$44.00"],
    ["Product cost", "$11.50"],
    ["Shipping + fees", "$15.50"],
    ["Ads", "$6.00"],
    ["Profit", "$11.00"],
  ]);
  expect(bars()[2]).toEqual(["$2.6kDec", "100%"]);
});

it("opens the static brief, adds a marker, and approves it into the publish queue", () => {
  press("Ad briefs");
  const briefs = app("Ad briefs");

  expect(pressed(briefs.querySelector(".chips") as HTMLElement)).toEqual([
    ["All formats", "true"],
    ["Video", "false"],
    ["Static", "false"],
  ]);
  expect(table(briefs)).toEqual([
    ["Brief", "State", "Format", "Items"],
    ["Spring kit · static", "Draft", "Static", "2 designs"],
    ["Frog kit hook test", "Approved", "Video", "3 variants"],
    ["Holiday bundle", "Archived", "Static", "1 design"],
  ]);
  expect(badges(briefs).map(([, className]) => className)).toEqual(["badge", "badge badge-dark", "badge"]);
  expect(within(briefs).getAllByRole("button", { name: /kit|bundle/ }).map((b) => b.textContent)).toEqual(["Spring kit · static"]);
  press("Video");
  expect(table(briefs).slice(1).map(([name]) => name)).toEqual(["Frog kit hook test"]);
  expect(within(briefs).queryByRole("button", { name: "Frog kit hook test" })).toBeNull();
  press("Static");
  expect(table(briefs).slice(1).map(([name]) => name)).toEqual(["Spring kit · static", "Holiday bundle"]);

  press("Spring kit · static");
  within(briefs).getByRole("heading", { level: 3, name: "Static ad brief" });
  expect(briefs.querySelector(".admin-title")?.textContent).toBe("Spring kit · static Static Draft");
  within(briefs).getByText("2 designs · revision 1");
  expect((within(briefs).getByRole("textbox", { name: "Notes" }) as HTMLTextAreaElement).value).toBe(
    "Warm light. Show hands, not faces.",
  );
  const picture = () => within(briefs).getByRole("img");
  expect(picture().getAttribute("aria-label")).toBe("Reference picture with 2 numbered markers");
  expect(table(briefs)).toEqual([
    ["Marker", "Variation A", "Variation B"],
    ["1 Headline", "Your first clay figure tonight", "Make a frog in 20 minutes"],
    ["2 Primary text", "Everything in one box.", "No kiln. No mess."],
  ]);
  press("+ Add marker");
  expect(picture().getAttribute("aria-label")).toBe("Reference picture with 3 numbered markers");
  expect(picture().textContent).toBe("123");
  expect(table(briefs)[3]).toEqual(["3 ", "—", "—"]);
  expect(within(briefs).queryByText("Queued in Meta Publish · Facebook and Instagram")).toBeNull();
  expect(briefs).toMatchSnapshot("static brief");
  press("Approve");
  expect(briefs.querySelector(".admin-title")?.textContent).toBe("Spring kit · static Static Approved");
  expect(badges(briefs)).toEqual([
    ["Static", "badge"],
    ["Approved", "badge badge-dark"],
  ]);
  within(briefs).getByText("Queued in Meta Publish · Facebook and Instagram");
  expect(button("Approve").disabled).toBe(true);
  press("← Briefs");
  within(briefs).getByRole("heading", { level: 3, name: "Ad briefs" });
  expect(table(briefs)[1]).toEqual(["Spring kit · static", "Approved", "Static", "2 designs"]);
});

it("starts each example afresh when a visitor switches away and back", () => {
  press("Ad briefs");
  press("Spring kit · static");
  press("Pack Station");
  press("#1042");
  press("Ad briefs");
  within(app("Ad briefs")).getByRole("heading", { level: 3, name: "Ad briefs" });
  press("Pack Station");
  within(app("Pack Station")).getByRole("table");
});
