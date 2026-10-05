// The landing page's about section, its phone screens, its install steps and their copy button, its
// install buttons along the way, and its shaded bands. App.test.tsx covers the rest of the page.
import { act, cleanup, fireEvent, render, screen, within } from "@testing-library/react";
import { afterEach, expect, it, vi } from "vitest";
import App from "./App";
import { ADD_ONS, AGENTS, INSTALL_PROMPT, REPO_URL, computers, freeAccounts } from "./install";

function renderAt(path: string) {
  window.history.pushState({}, "", path);
  return render(<App />);
}

afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
});

// Developer words the page keeps out of its copy above the comparison.
const JARGON = /\b(repos?|pull requests?|deploy\w*)\b|\b(PR|CI)\b/;

/** A Paseo screenshot's file and its label. */
const paseo = (shot: Element) => [shot.getAttribute("src"), shot.getAttribute("alt")];

/** Each phone screen's button, screenshot, label, and line, in order. */
const PHONE_SCREENS = [
  [
    "Chat",
    "/paseo/phone.webp",
    "Paseo on a phone: a chat with the agent, asking which of four next steps to take",
    "Ask in plain words. It asks which step to take when it needs you, and keeps working when you walk away.",
  ],
  [
    "Plan review",
    "/paseo/review.webp",
    "Paseo on a phone: the agent's plan to review, with numbered changes and a Note button beside each",
    "Review a short plan first. Tap Note on anything you'd change before it builds.",
  ],
  [
    "Changes",
    "/paseo/changes.webp",
    "Paseo on a phone: the files a change touched, each with the lines it added and removed",
    "See every change. Each file it touched, and how much, before it goes live.",
  ],
  [
    "Files",
    "/paseo/files.webp",
    "Paseo on a phone: the folders and files in a project",
    "Look through everything. Every file in your project, from your phone.",
  ],
  [
    "Workspaces",
    "/paseo/workspaces.webp",
    "Paseo on a phone: a list of workspaces, with several tasks running at once and whether each one's checks passed",
    "Run several jobs at once. Each task gets its own workspace, and shows when its checks pass. Then it sends a link to try.",
  ],
];

/** The section under an h2, found by its heading. */
const section = (name: string) => screen.getByRole("heading", { level: 2, name }).closest("section") as HTMLElement;

const ABOUT = [
  "I'm Matt. I run Claymoo, a clay-kit company. WongStack is the setup we use there for almost everything.",
  "AI is moving fast. I want everyone to have the same tools, and to see what AI can do, so we all take AI safety seriously.",
];

it("says who built it and why, with Matt's photo, between the hero and the phones", () => {
  const { container } = renderAt("/");
  const about = section("Why I built this");
  const photo = within(about).getByRole("img", { name: "Matt Wong" });

  expect(about.previousElementSibling).toBe(container.querySelector(".hero"));
  expect(about.nextElementSibling?.querySelector("h2")?.textContent).toBe("Built by chatting, from my phone");
  expect(photo.getAttribute("src")).toBe("/me.webp");
  expect(photo.hasAttribute("loading")).toBe(false);
  // The photo comes first, so on a wide screen it sits left of the text.
  expect(about.querySelector("h2 + div")?.firstElementChild).toBe(photo);
  expect([...about.querySelectorAll("p")].map((p) => p.textContent)).toEqual(ABOUT);
  expect(within(about).queryAllByRole("button")).toHaveLength(0);
  expect(within(about).queryAllByRole("link")).toHaveLength(0);
  expect(about.classList.contains("band-shade")).toBe(false);
  expect(about.textContent).not.toMatch(JARGON);
});

it("answers why it is free in one sentence, right after whether it is free", () => {
  const { container } = renderAt("/");
  const summaries = [...container.querySelectorAll(".faq summary")];
  const why = summaries.find((s) => s.textContent === "Why is it free?");

  expect(summaries[0]?.textContent).toBe("Is WongStack free?");
  expect(summaries[1]).toBe(why);
  expect(why?.nextElementSibling?.textContent).toBe(
    "I built it to run my own company, and I want everyone to have the same tools.",
  );
});

it("taps through five Paseo phone screens, one pressed at a time, Chat first, in plain words", () => {
  renderAt("/");
  const phones = section("Built by chatting, from my phone");
  const buttons = within(phones).getAllByRole("button");
  const pressed = () =>
    buttons.filter((button) => button.getAttribute("aria-pressed") === "true").map((b) => b.textContent);
  const shown = () => within(phones).getAllByRole("img").map(paseo);
  const line = () => (phones.querySelector(".lede b") as HTMLElement).parentElement?.textContent;

  expect(buttons.map((button) => button.textContent)).toEqual(PHONE_SCREENS.map(([name]) => name));
  expect(pressed()).toEqual(["Chat"]);
  expect(shown()).toEqual([["/paseo/phone.webp", PHONE_SCREENS[0]?.[2]]]);
  for (const [i, [name, src, alt, text]] of PHONE_SCREENS.entries()) {
    fireEvent.click(buttons[i] as HTMLElement);
    expect(pressed()).toEqual([name]);
    expect(shown()).toEqual([[src, alt]]);
    expect(line()).toBe(text);
    expect(phones.textContent).not.toMatch(JARGON);
  }
  // The text and buttons come first, so on a wide screen the phone sits right of them.
  expect(phones.lastElementChild?.querySelector("img")?.getAttribute("src")).toBe("/paseo/workspaces.webp");
});

/** Presses the copy icon on `root`'s install message over a clipboard that copies or refuses; returns what it was asked to copy. */
async function copyMessage(root: HTMLElement, copies: boolean) {
  const writeText = vi.fn(async () => (copies ? undefined : Promise.reject(new Error("denied"))));
  vi.stubGlobal("navigator", { clipboard: { writeText } });
  await act(async () => fireEvent.click(within(root).getByRole("button", { name: "Copy message" })));
  return writeText.mock.calls;
}

it("shows three install steps in their own section, just above the questions, with the message from install.ts", () => {
  const { container } = renderAt("/");
  const install = container.querySelector("section#install") as HTMLElement;
  const steps = install.querySelector("ol.install") as HTMLElement;

  expect(install.querySelector("h2")?.textContent).toBe("Install it for free");
  expect(install.querySelector(".lede")?.textContent).toBe("It runs on your own computer, with your own AI plan.");
  expect(install.nextElementSibling?.querySelector("h2")?.textContent).toBe("Questions");
  expect([...steps.querySelectorAll(":scope > li > p:first-child")].map((p) => p.textContent)).toEqual([
    `Open ${AGENTS.map((agent) => `${agent.name}, `).join("")}or any AI that can work on your computer`,
    "Paste this into a new chat",
    "Answer a few questions",
  ]);
  expect(
    within(steps)
      .getAllByRole("link")
      .map((link) => [link.textContent, link.getAttribute("href")]),
  ).toEqual(AGENTS.map((agent) => [agent.name, agent.href]));
  expect(AGENTS.length).toBeGreaterThan(0);
  // The phone app comes later, as an add-on.
  expect(steps.textContent).not.toMatch(/Paseo/);
  // One line with no stray space. Its wording is the README's: scripts/tests/landing-site.test.mjs checks that.
  expect(INSTALL_PROMPT).toMatch(/^\S.*\S$/);
  expect(steps.querySelector("li:nth-child(2) pre")?.textContent).toBe(INSTALL_PROMPT);
  expect(container.querySelectorAll("pre")).toHaveLength(1);
});

it("says which computers it works on and which accounts it needs, under the steps, from install.ts", () => {
  const { container } = renderAt("/");
  const note = container.querySelector("#install ol.install + p.note") as HTMLElement;

  expect(note.textContent).toBe(`Works on ${computers()}. You need ${freeAccounts()}.`);
  expect(within(note).queryAllByRole("link")).toHaveLength(0);
});

it("lists the one optional add-on under the install steps, with what it enables", () => {
  const { container } = renderAt("/");
  const extras = container.querySelector("#install .extras") as HTMLElement;

  expect(extras).toBe(container.querySelector("#install")?.lastElementChild);
  expect(extras.querySelector("h3")?.textContent).toBe("Optional, once it works");
  expect(
    [...extras.querySelectorAll("li")].map((li) => [
      li.querySelector("a")?.textContent,
      li.querySelector("a")?.getAttribute("href"),
      li.querySelector("p")?.textContent,
    ]),
  ).toEqual([["Add Paseo", "https://paseo.sh", "Chat from your phone, and work on several tasks side by side."]]);
  expect(ADD_ONS).toHaveLength(1);
});

it("copies the install message, and says it was copied", async () => {
  const { container } = renderAt("/");
  const install = container.querySelector("#install") as HTMLElement;

  expect(await copyMessage(install, true)).toEqual([[INSTALL_PROMPT]]);
  expect(within(install).getByRole("button", { name: "Copied" }).hasAttribute("data-copied")).toBe(true);
  expect(within(install).queryByRole("status")).toBeNull();
});

it("keeps the install message on the page and says to select it when the browser refuses to copy it", async () => {
  const { container } = renderAt("/");
  const install = container.querySelector("#install") as HTMLElement;

  expect(await copyMessage(install, false)).toEqual([[INSTALL_PROMPT]]);
  expect(within(install).getByRole("status").textContent).toBe("Select the message and copy it.");
  expect(install.querySelector("pre")?.textContent).toBe(INSTALL_PROMPT);
  within(install).getByRole("button", { name: "Copy message" });
});

it("offers the install at the end of the setup and the comparison, not after the phones or the examples", () => {
  const { container } = renderAt("/");
  const last = (name: string) => section(name).lastElementChild;

  for (const name of ["The hardest part is the setup. It's done.", "How WongStack compares"]) {
    expect([last(name)?.textContent, last(name)?.getAttribute("href"), last(name)?.className]).toEqual([
      "Install for free",
      "#install",
      "button",
    ]);
  }
  for (const name of ["Built by chatting, from my phone", "Examples of things I've done"]) {
    expect(within(section(name)).queryByRole("link", { name: "Install for free" })).toBeNull();
  }
  expect(container.querySelector(".hero a.button")?.getAttribute("href")).toBe("#install");
});

it("keeps one filled button above the fold: the header's links and the hero's GitHub link are plain text", () => {
  const { container } = renderAt("/");
  const header = container.querySelector("header") as HTMLElement;
  const hero = container.querySelector(".hero") as HTMLElement;

  expect(
    within(header)
      .getAllByRole("link")
      .map((link) => [link.textContent, link.getAttribute("href"), link.className]),
  ).toEqual([
    ["WongStack", "/", ""],
    ["GitHub", REPO_URL, ""],
    ["Install", "/#install", ""],
  ]);
  expect([...hero.querySelectorAll(".button")].map((button) => button.textContent)).toEqual(["Install for free"]);
  expect(within(hero).getByRole("link", { name: "See it on GitHub →" }).className).toBe("more");
});

it("shades the phones, the examples, the stack, and the FAQ, and no other section", () => {
  const { container } = renderAt("/");

  expect([...container.querySelectorAll(".band-shade")].map((band) => band.querySelector("h2")?.textContent)).toEqual([
    "Built by chatting, from my phone",
    "Examples of things I've done",
    "WongStack is free and open source.",
    "Questions",
  ]);
});
