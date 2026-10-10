// The landing page's story, install steps and their copy button, its
// install buttons along the way, and its shaded bands. App.test.tsx covers the rest of the page.
import { act, cleanup, fireEvent, render, screen, within } from "@testing-library/react";
import { afterEach, expect, it, vi } from "vitest";
import App from "./App";
import { AGENTS, PASEO, ASKS_FIRST, INSTALL_PROMPT, REPO_URL, STEPS, WAYS } from "./install";

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

it("keeps the whole business story in distinct compositions with connected equal knowledge inputs", () => {
  const { container } = renderAt("/");
  const context = container.querySelector("dl.knowledge-inputs") as HTMLElement;
  expect([...context.querySelectorAll("dt")].map((dt) => dt.childNodes[0]?.textContent?.trim())).toEqual(["Processes", "Data", "Reasons"]);
  expect([...context.children].every((artifact) => artifact.querySelector("dd")?.textContent)).toBe(true);
  expect([...context.querySelectorAll("dd")].map((item) => item.textContent)).toEqual([
    "How work gets done, in code and guides.", "The facts your business runs on.", "Why decisions were made.",
  ]);
  expect(context.querySelector("ul, blockquote")).toBeNull();
  expect(container.querySelector(".knowledge-roles")).toBeNull();
  expect(context.nextElementSibling?.className).toBe("join-rail");
  expect(context.nextElementSibling?.nextElementSibling?.textContent).toContain("Shared business context");
  const scenes = [...container.querySelectorAll(".story")];
  expect(scenes).toHaveLength(5);
  for (const scene of scenes) {
    expect(scene.querySelector("h2")?.id).toBe(scene.getAttribute("aria-labelledby"));
  }
  const words = [...container.querySelectorAll(".story-copy > p")].map((el) => el.textContent).join(" ").split(/\s+/);
  expect(words.length).toBeLessThanOrEqual(120);
  const operations = section("Start with operations.");
  expect(operations.querySelectorAll(".app-showcase .browser")).toHaveLength(1);
  expect(operations.textContent).toContain("Sample data. Nothing is saved.");
  expect(container.querySelector(".built-tool")).toBeNull();
  expect(operations.querySelector(".foundation")).toBeNull();
  expect(operations.querySelector(".story-copy > p")?.textContent).toContain("WongStack sets up the foundation.");
  expect(operations.querySelector(".pipeline-ingredients")).toBeNull();
  const data = section("Your processes connect your data.");
  const connections = within(data).getByRole("figure", { name: "Example tools and the business data they connect" });
  expect(data.querySelector(".story-copy")?.nextElementSibling).toBe(connections);
  expect([...connections.querySelectorAll("dt")].map((item) => item.textContent)).toEqual(["Packing tool", "Ad report"]);
  expect([...connections.querySelectorAll("dd")].map((item) => [...item.querySelectorAll("li")].map((source) => source.textContent))).toEqual([["Order Data", "Stock Levels"], ["Sales Data", "Website Analytics"]]);
  expect(connections.querySelector("figcaption")?.textContent).toContain("connections you build");
  const retention = section("The more you chat, the more it knows your business.");
  const conversation = within(retention).getByRole("figure", { name: /Example conversation remembering/ });
  expect(conversation.querySelectorAll("blockquote")).toHaveLength(2);
  expect(conversation.querySelector(".remembered-note")?.textContent).toContain("Broad discounts hurt margins.");
  expect(conversation.querySelector("figcaption")?.textContent).toContain("example conversation");
  expect(retention.querySelector(".story-copy > p")?.textContent).toContain("in accounts you own");
  expect(retention.querySelector(".capture-diagram, .knowledge-carry")).toBeNull();
  const team = section("The whole team starts with context.");
  expect(team.textContent).toContain("with access you choose");
  expect(team.querySelector(".team-use")).toBeNull();
  expect(team.querySelector(".onboarding")).toBeNull();
  expect(team.querySelector(".story-copy > p")?.textContent).toContain("New teammates start with existing knowledge.");
  expect(team.querySelector(".story-copy > p")?.textContent).toContain("the next task starts with more context");
  const question = within(team).getByRole("figure", { name: /Example promotion question gathering/ });
  expect(within(team).getAllByText(/“Can we run this promotion\?”/)).toHaveLength(1);
  expect(team.querySelector(".story-copy")?.nextElementSibling).toBe(question);
  expect(question.querySelector(".team-question")).not.toBeNull();
  expect(question.querySelectorAll(".department-evidence > div")).toHaveLength(3);
  expect([...question.querySelectorAll("dt > span")].map((item) => item.textContent)).toEqual([
    "Reading the campaign goal", "Checking past discount decisions", "Checking stock and capacity",
  ]);
  expect([...question.querySelectorAll("dt")].map((item) => item.childNodes[0]?.textContent?.trim())).toEqual(["Marketing", "Finance", "Operations"]);
  expect([...question.querySelectorAll("dd")].map((item) => item.textContent)).toEqual([
    "Reach new customers.", "Broad discounts hurt margins.", "Limited stock ready to ship.",
  ]);
  const gathered = question.querySelector(".gathered-context") as HTMLElement;
  expect(question.querySelector(".team-question")?.nextElementSibling).toBe(gathered);
  expect(gathered.querySelector(".gather-label")?.textContent).toBe("Your assistant gathers context");
  const answer = gathered.nextElementSibling as HTMLElement;
  expect(answer.className).toBe("team-answer");
  expect(answer.querySelector("span")?.textContent).toBe("Example answer");
  expect(answer.querySelector("p")?.textContent).toBe("Reach new customers with a smaller campaign on stocked items. Offer a bundle to protect margins.");
  expect(question.querySelector("figcaption")?.textContent).toContain("connections you’ve built, within the access you choose");
  expect(team.querySelector(".phone-tour, .department-sources, .question-pipeline, .answer-join")).toBeNull();
  expect(container.querySelector(".about, .points")).toBeNull();
});

it("keeps the single optional-app attribution with the laptop and removes phone presentation", () => {
  const { container } = renderAt("/");
  const attribution = container.querySelectorAll(".hero-picture figcaption");
  expect(attribution).toHaveLength(1);
  expect(attribution[0]?.textContent).toBe("Shown in Paseo, an optional chat app.");
  expect(within(attribution[0] as HTMLElement).getByRole("link", { name: PASEO.name }).getAttribute("href")).toBe(PASEO.href);
  expect(screen.getAllByRole("link", { name: PASEO.name })).toHaveLength(1);
  expect(container.querySelectorAll('img[src^="/paseo/"]')).toHaveLength(1);
  expect(container.querySelector(".phone-tour")).toBeNull();
});

it("labels working tools as examples and keeps their contents in a keyboard-scrollable display", () => {
  renderAt("/");
  const operations = section("Start with operations.");
  within(operations).getByRole("heading", { level: 3, name: "Examples you can build" });
  const frame = operations.querySelector(".browser");
  let previousContents: HTMLElement | undefined;
  for (const name of ["Pack Station", "Profit by channel", "Ad briefs"]) {
    fireEvent.click(within(operations).getByRole("button", { name }));
    const contents = within(operations).getByRole("region", { name: `${name} example contents` });
    expect(contents.getAttribute("tabindex")).toBe("0");
    expect(contents.parentElement?.className).toBe("browser");
    expect(contents.parentElement).toBe(frame);
    if (previousContents) expect(contents).not.toBe(previousContents);
    previousContents = contents;
    expect(contents.querySelector(".admin")).not.toBeNull();
  }
});

it("answers why it is free in one sentence, right after whether it is free", () => {
  const { container } = renderAt("/");
  const summaries = [...container.querySelectorAll(".faq summary")];
  const why = summaries.find((s) => s.textContent === "Why is it free?");
  expect(summaries[0]?.textContent).toBe("Is WongStack free?");
  expect(summaries[1]).toBe(why);
  expect(why?.nextElementSibling?.textContent).toBe("It is open source software you can use, change, and share.");
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

it("offers install beside the operations example and after compatibility", () => {
  const { container } = renderAt("/");
  for (const name of ["Start with operations.", "Use the best models."]) {
    expect(within(section(name)).getByRole("link", { name: "Install for free" }).getAttribute("href")).toBe("#install");
  }
  expect(container.querySelector(".app-showcase a.button")).toBeNull();
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

it("shades operations and the FAQ", () => {
  const { container } = renderAt("/");

  expect([...container.querySelectorAll(".band-shade")].map((band) => band.querySelector("h2")?.textContent)).toEqual([
    "Start with operations.",
    "Questions",
  ]);
});
