// The Attachments page: a card per file in site/attachments/, in order, each with its own link and its full text
// to copy. Site.test.tsx holds it to the rules every page keeps.
import { act, cleanup, fireEvent, render, screen, within } from "@testing-library/react";
import { afterEach, expect, it, vi } from "vitest";
import App from "./App";
import { ATTACHMENTS } from "./attachmentFiles";
import { REPO_URL } from "./install";

/** The first seven, in the order the plan set them. */
const SLUGS = ["memory", "know-how", "plan-first", "safe-changes", "team-learning", "team-access", "own-your-setup"];

function renderAt(path: string) {
  window.history.pushState({}, "", path);
  return render(<App />);
}

afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
});

const cards = (root: HTMLElement) => [...root.querySelectorAll<HTMLElement>("section.attachment")];

it("serves the page at /attachments, with or without a trailing slash: a title, a short line, then the seven cards in order", () => {
  for (const path of ["/attachments", "/attachments/"]) {
    const { container } = renderAt(path);
    screen.getByRole("heading", { level: 1, name: "Attachments" });
    expect(container.querySelector(".attachments > .lede")?.textContent).toBe(
      "Paste one into your AI chat. It adds the fix to the setup you have.",
    );
    expect(cards(container).map((card) => card.id)).toEqual(SLUGS);
    cleanup();
  }
  expect(ATTACHMENTS.map((attachment) => attachment.order)).toEqual([1, 2, 3, 4, 5, 6, 7]);
});

it("gives each card its title linking to its own anchor, the problem, the fix, and its full text with a copy button", () => {
  const { container } = renderAt("/attachments");
  for (const [index, card] of cards(container).entries()) {
    const attachment = ATTACHMENTS[index]!;
    const title = within(card).getByRole("heading", { level: 2 });
    expect([title.textContent, title.querySelector("a")?.getAttribute("href")]).toEqual([attachment.title, `#${attachment.slug}`]);
    const [problem, fix] = [...card.querySelectorAll(":scope > p")].map((p) => p.textContent);
    expect([problem, fix]).toEqual([attachment.problem, `Fix: ${attachment.fix}`]);
    expect(card.querySelector("pre")?.textContent).toBe(attachment.body);
    within(card).getByRole("button", { name: "Copy message" });
  }
});

it("ends every attachment with a bullet that points to the repository", () => {
  for (const { slug, body } of ATTACHMENTS) {
    const last = body.split("\n").at(-1) ?? "";
    expect([slug, last.startsWith("> ") && last.includes(REPO_URL)]).toEqual([slug, true]);
  }
});

it("copies a card's full text with one tap", async () => {
  const writeText = vi.fn(async () => undefined);
  vi.stubGlobal("navigator", { clipboard: { writeText } });
  const { container } = renderAt("/attachments");
  const card = container.querySelector<HTMLElement>("#team-access") as HTMLElement;
  await act(async () => fireEvent.click(within(card).getByRole("button", { name: "Copy message" })));
  expect(writeText).toHaveBeenCalledExactlyOnceWith(ATTACHMENTS.find((a) => a.slug === "team-access")?.body);
  within(card).getByRole("button", { name: "Copied" });
});

it("opens a link to one card at that card", () => {
  const scrolled: string[] = [];
  Element.prototype.scrollIntoView = vi.fn(function (this: Element) {
    scrolled.push(this.id);
  });
  renderAt("/attachments#safe-changes");
  expect(scrolled).toEqual(["safe-changes"]);
});
