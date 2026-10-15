// The landing page's story, its chart, install steps and their copy button, its
// install buttons along the way, and its shaded bands. App.test.tsx covers the rest of the page.
import { act, cleanup, fireEvent, render, screen, within } from "@testing-library/react";
import { afterEach, expect, it, vi } from "vitest";
import App from "./App";
import { CHECKED, KINDS, PRODUCTS } from "./compare";
import { AGENTS, ASKS_FIRST, INSTALL_PROMPT, REPO_URL, STEPS, WAYS } from "./install";

function renderAt(path: string) {
  window.history.pushState({}, "", path);
  return render(<App />);
}

afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
});

/** The section under an h2, found by its heading. */
const section = (name: string) => screen.getByRole("heading", { level: 2, name }).closest("section") as HTMLElement;

it("tells each slide as its own scene: a step label, a heading, one line, and a picture", () => {
  const { container } = renderAt("/");
  const scenes = [...container.querySelectorAll(".story")];
  expect(scenes.map((scene) => scene.querySelector(".story-step")?.textContent)).toEqual([
    "01 / The idea", "02 / Data", "03 / Process", "04 / Reason", "05 / One example",
  ]);
  for (const scene of scenes) {
    expect(scene.querySelector("h2")?.id).toBe(scene.getAttribute("aria-labelledby"));
    expect(scene.querySelectorAll(".story-copy > p")).toHaveLength(1);
    expect(scene.querySelector("figure")).not.toBeNull();
  }
  const words = [...container.querySelectorAll(".story-copy > p")].map((el) => el.textContent).join(" ").split(/\s+/);
  expect(words.length).toBeLessThanOrEqual(120);

  const three = section("Your business has the same three.");
  expect(three.querySelector(".story-copy > p")?.textContent).toBe("A self-driving car needs sensors, rules, and navigation.");
  expect([...three.querySelectorAll(".three-pairs > li")].map((pair) => [
    pair.querySelector(".car-part")?.textContent, pair.querySelector("strong")?.textContent, pair.querySelector(".part-line")?.textContent,
  ])).toEqual([
    ["Sensors", "Data", "What your business sees"],
    ["Rules", "Process", "How the work gets done"],
    ["Navigation", "Reason", "Where to go, and why"],
  ]);

  const data = section("Data is what your business sees.");
  expect(data.querySelector(".story-copy > p")?.textContent).toBe("Ads in one tool, sales in another: blind spots. In one place you own, AI sees the whole road.");
  expect([...data.querySelectorAll(".data-sources li")].map((li) => li.textContent)).toEqual(["Ad spend", "Creatives", "Sales", "Customers"]);
  expect(data.querySelector(".one-place")?.textContent).toBe("One place you own");

  const process = section("Process is how the work gets done.");
  expect(process.querySelector(".story-copy > p")?.textContent).toBe("The process changes all the time. Only what runs the job stays up to date.");
  expect([...process.querySelectorAll(".process-steps li")].map((li) => li.textContent)).toEqual(["Research", "Brief", "Creative", "Publish"]);
  expect([...process.querySelectorAll(".process-kinds dd")].map((dd) => dd.textContent)).toEqual([
    "Does the same step the same way, every time", "Steps the AI follows when it takes judgment", "Nobody runs it, so it never gets updated",
  ]);
  expect(process.querySelector(".browser, .app-showcase, a.button")).toBeNull();

  const example = section("One example: publishing an ad.");
  expect(example.querySelector(".story-copy > p")?.textContent).toBe("Start with one process, and the other two come with it.");
  expect([...example.querySelectorAll(".example-rows > div")].map((row) => [row.querySelector("dt")?.textContent, row.querySelector("dd")?.textContent])).toEqual([
    ["Your ad metrics", "Data"], ["Your campaign structure", "Process"], ["Why you have this setup", "Reason"],
  ]);

  // Each slide figure draws its icons inline, hidden from screen readers: the words beside them say it.
  const icons = [...container.querySelectorAll(".story svg.icon")];
  expect(icons.length).toBeGreaterThan(10);
  for (const icon of icons) expect(icon.getAttribute("aria-hidden")).toBe("true");
  expect(container.querySelector(".team-scene, .knowledge-inputs, .learning-chat, .remembered-note, .data-connections")).toBeNull();
});

it("shows an SOP as crossed out in its words and marks, not by color alone", () => {
  renderAt("/");
  const kinds = section("Process is how the work gets done.").querySelector(".process-kinds") as HTMLElement;
  const [code, skill, sop] = [...kinds.querySelectorAll(":scope > div")] as HTMLElement[];
  expect([code?.querySelector("dt")?.textContent, skill?.querySelector("dt")?.textContent]).toEqual(["✓Code", "✓A skill"]);
  expect(sop?.querySelector("dt s")?.textContent).toBe("An SOP");
  expect(sop?.querySelector("dt .sr-only")?.textContent).toBe("Not ");
  expect(sop?.querySelector("dt .kind-mark")?.textContent).toBe("✗");
});

it("says reasons are saved from chats, and shows no one asking the assistant to remember", () => {
  renderAt("/");
  const reason = section("Reason is why you chose this road.");
  expect(reason.querySelector(".story-copy > p")?.textContent).toBe("Saved from your chats, so the next task starts with the why.");
  expect([...reason.querySelectorAll(".why-questions li")].map((li) => li.textContent)).toEqual([
    "Why are we running ads?", "Why this audience?", "Why this message?",
  ]);
  expect(reason.textContent).not.toMatch(/remember/i);
  expect(reason.querySelector("blockquote")).toBeNull();
  // The talk's road runs under the questions.
  expect(reason.querySelector("figure img.road")?.getAttribute("src")).toBe("/art/road.webp");
});

it("shows the chart after the example: a column per product, a row per kind, each mark in words too, in its own scroll box", () => {
  const { container } = renderAt("/");
  const chart = section("What each tool says it keeps.");
  expect(chart.previousElementSibling?.querySelector("h2")?.textContent).toBe("One example: publishing an ad.");
  expect(chart.nextElementSibling?.querySelector("h2")?.textContent).toBe("Use the best models.");

  const table = within(chart).getByRole("table");
  expect([...table.querySelectorAll('th[scope="col"]')].map((th) => [th.textContent, th.querySelector("img")?.getAttribute("src"), th.querySelector("img")?.getAttribute("alt")])).toEqual(
    PRODUCTS.map(({ name, logo }) => [name, logo, ""]),
  );
  expect(PRODUCTS[0]?.name).toBe("WongStack");
  expect([...table.querySelectorAll('th[scope="row"]')].map((th) => th.textContent)).toEqual(KINDS);
  const rows = [...table.querySelectorAll("tbody tr")].map((row) => [...row.querySelectorAll("td")].map((td) => td.textContent));
  expect(rows).toEqual(KINDS.map((_, k) => PRODUCTS.map(({ marks }) => (marks[k] === "yes" ? "✓Yes" : "–Not stated"))));
  for (const td of table.querySelectorAll("td")) {
    if (!td.textContent) continue;
    expect([td.querySelector("[aria-hidden=true]")?.textContent?.length, td.querySelector(".sr-only")?.textContent?.length]).toEqual([1, expect.any(Number)]);
  }
  // Every row has WongStack's mark, and the legend and the date sit under the chart.
  expect(rows.every((row) => row[0] === "✓Yes")).toBe(true);
  expect([...chart.querySelectorAll(":scope > .note")].map((note) => note.textContent)).toEqual([
    "✓ their own pages say so · – not stated",
    `Checked ${CHECKED}. OpenClaw, Muse, Grok Bot, ChatGPT, and Claude belong to their makers. WongStack is not affiliated with them.`,
  ]);
  // A phone scrolls the table in its own box, which a keyboard can reach.
  const box = table.parentElement as HTMLElement;
  expect([box.className, box.getAttribute("role"), box.getAttribute("tabindex")]).toEqual(["compare-scroll", "region", "0"]);
  expect(container.querySelectorAll("table")).toHaveLength(1);
});

it("lists what setup handles just before the install steps", () => {
  const { container } = renderAt("/");
  const setup = section("The hardest part is the setup.");
  expect(setup.querySelector(".lede")?.textContent).toBe("Handled for you. AI figures out any problems.");
  expect([...setup.querySelectorAll(".handled li")].map((li) => li.textContent)).toEqual([
    "Servers and databases", "Security", "Collaboration", "Memory",
  ]);
  expect(setup.nextElementSibling).toBe(container.querySelector("#install"));
  expect(setup.previousElementSibling?.querySelector("h2")?.textContent).toBe("Use the best models.");
});

it("answers why it is free in one sentence, right after whether it is free", () => {
  const { container } = renderAt("/");
  const summaries = [...container.querySelectorAll(".faq summary")];
  const why = summaries.find((s) => s.textContent === "Why is it free?");
  expect(summaries[0]?.textContent).toBe("Is WongStack free?");
  expect(summaries[1]).toBe(why);
  expect(why?.nextElementSibling?.textContent).toBe("It is open source software you can use, change, and share.");
});

/** Presses the copy icon on `root`'s install message; the clipboard copies or refuses. Returns the text it got. */
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
    `Open any assistant that can work on your computer, such as ${AGENTS.map((agent) => agent.name).join(" or ")}`,
    "Paste this into a new chat",
    "Answer a few questions",
  ]);
  expect(
    within(steps)
      .getAllByRole("link")
      .map((link) => [link.textContent, link.getAttribute("href")]),
  ).toEqual(AGENTS.map((agent) => [agent.name, agent.href]));
  expect(AGENTS.length).toBeGreaterThan(0);
  // The neutral words come first: every assistant the step names follows them, as an example.
  const first = steps.querySelector("li")?.textContent as string;
  expect(first.startsWith(STEPS.open)).toBe(true);
  expect(STEPS.open).toMatch(/^Open any assistant that can work on your computer, such as$/);
  for (const { name } of AGENTS) {
    expect([name, STEPS.open.includes(name), first.indexOf(name) >= STEPS.open.length]).toEqual([name, false, true]);
  }
  // The optional pictured app stays outside the install steps.
  expect(steps.textContent).not.toMatch(/Paseo/);
  // One line with no stray space. Its wording is the README's: scripts/tests/landing-site.test.mjs checks that.
  expect(INSTALL_PROMPT).toMatch(/^\S.*\S$/);
  expect(steps.querySelector("li:nth-child(2) pre")?.textContent).toBe(INSTALL_PROMPT);
  expect(container.querySelectorAll("pre")).toHaveLength(1);
});

it("keeps canonical computer, account, route and cost-consent details in the adjacent setup questions", () => {
  const { container } = renderAt("/");
  const setup = screen.getByText("What does setup need?").closest("details") as HTMLElement;
  expect([...setup.querySelectorAll("p")].map((p) => p.textContent)).toEqual([
    "Works on Mac, Windows, and Linux.",
    ...WAYS.map((way) => way.line),
    ASKS_FIRST,
  ]);
  expect(setup.closest("section")).toBe(container.querySelector("#install")?.nextElementSibling);
  expect(container.querySelector("#install .ways")).toBeNull();
  expect(container.querySelector("#install h2")?.textContent).toBe("Install it for free");
  expect(container.querySelector("#install")?.classList.contains("install-section")).toBe(true);
});

it("keeps installation to the three steps without an optional add-on block", () => {
  const { container } = renderAt("/");
  const install = container.querySelector("#install") as HTMLElement;
  expect(install.lastElementChild?.className).toBe("install");
  expect(install.querySelector(".extras")).toBeNull();
  expect(within(install).queryByRole("link", { name: /Paseo/ })).toBeNull();
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

it("offers install in the hero, after the assistants, and at the close, and nowhere in the story", () => {
  const { container } = renderAt("/");
  expect([...container.querySelectorAll("a.button")].map((a) => [
    a.closest("section")?.querySelector("h1, h2")?.textContent,
    a.getAttribute("href"),
  ])).toEqual([
    ["Self-drive your business.", "#install"],
    ["Use the best models.", "#install"],
    ["Make it yours", "#install"],
  ]);
  expect(container.querySelector(".story a.button")).toBeNull();
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

it("shades the process scene and the FAQ", () => {
  const { container } = renderAt("/");

  expect([...container.querySelectorAll(".band-shade")].map((band) => band.querySelector("h2")?.textContent)).toEqual([
    "Process is how the work gets done.",
    "Questions",
  ]);
});
