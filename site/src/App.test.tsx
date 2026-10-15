// The landing page top to bottom, the privacy page, the header and footer, and which address shows which page.
// Landing.test.tsx covers the install section; Site.test.tsx covers the rules every page keeps.
import { cleanup, render, screen, within } from "@testing-library/react";
import { afterEach, expect, it, vi } from "vitest";
import App from "./App";
import { AGENTS, REPO_URL, freeAccounts } from "./install";

function renderAt(path: string) {
  window.history.pushState({}, "", path);
  return render(<App />);
}

afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
});

const HEADLINE = "Self-drive your business.";
const WORKS_WITH = "Use the best models.";
const START_SMALL = "Start with one operational process. Ask your assistant to build a tool around it, then keep what you learn.";
const DESCRIPTION =
  "A self-driving car sees the road, knows the rules, and knows where to go. Your business needs the same three, and AI sets them up in accounts you own.";

// Developer words the page keeps out of its copy above the works-with section.
const JARGON = /\b(repos?|pull requests?|deploy\w*)\b|\b(PR|CI)\b/;

/** The install button and the quiet link to the code: the hero and the closing call to action share them. */
const ACTIONS = ["Install for free #install", `See it on GitHub → ${REPO_URL}`];

const links = (root: Element | null) =>
  [...(root?.querySelectorAll("a") ?? [])].map((a) => `${a.textContent} ${a.getAttribute("href")}`);

it("opens with the plain headline, which names no product", () => {
  const { container } = renderAt("/");
  const h1 = screen.getByRole("heading", { level: 1, name: HEADLINE });

  expect(h1.textContent).toBe(HEADLINE);
  expect(h1.children).toHaveLength(0);
  for (const other of [...AGENTS.map((agent) => agent.name), "WongStack", "Grok", "Dots", "ChatGPT", "Paseo"]) {
    expect([other, h1.textContent?.includes(other)]).toEqual([other, false]);
  }
  expect(container.querySelector(".rotator, .rotator-row")).toBeNull();
  expect(container.querySelector(".hero-copy")?.firstElementChild).toBe(h1);
  expect(container.querySelectorAll("h1")).toHaveLength(1);
});

it("opens with a short offer and install actions before the business explanation", () => {
  const { container } = renderAt("/");
  const hero = container.querySelector(".hero") as HTMLElement;
  expect(hero.querySelectorAll(".lede")).toHaveLength(1);
  expect(within(hero).getByText(DESCRIPTION).className).toBe("lede");
  expect(links(hero.querySelector(".lede + p.actions"))).toEqual(ACTIONS);
  const car = hero.querySelector(".hero-picture img") as HTMLImageElement;
  expect([car.getAttribute("src"), car.getAttribute("alt"), car.getAttribute("width"), car.getAttribute("height")]).toEqual([
    "/art/car.webp",
    "A self-driving car with a sensor on its roof, following a dotted path to a map pin",
    "1600",
    "480",
  ]);
  expect(hero.querySelector("figcaption")).toBeNull();
  expect(hero.nextElementSibling?.classList.contains("story")).toBe(true);
  expect(container.querySelectorAll('a[href*="claymoo" i]')).toHaveLength(0);
});

it("tells the self-drive story in the talk's order, then the chart, the assistants, the setup, and install", () => {
  const { container } = renderAt("/");
  expect(screen.getAllByRole("heading", { level: 2 }).map((h) => h.textContent)).toEqual([
    "Your business has the same three.",
    "Data is what your business sees.",
    "Process is how the work gets done.",
    "Reason is why you chose this road.",
    "One example: publishing an ad.",
    "What each tool says it keeps.",
    WORKS_WITH,
    "The hardest part is the setup.",
    "Install it for free",
    "Questions",
    "Make it yours",
  ]);
  // The cut parts stay cut: no screenshot of a chat app, no sample tools, no team scene.
  expect(container.querySelectorAll('img[src^="/paseo/"]')).toHaveLength(0);
  expect(container.querySelector(".browser, .app-showcase, .team-scene, .stack, .supports")).toBeNull();
  expect(screen.queryByRole("link", { name: "Paseo" })).toBeNull();
  // The talk's two pictures, each with its size set and a plain label.
  expect([...container.querySelectorAll('img[src^="/art/"]')].map((img) => img.getAttribute("src"))).toEqual([
    "/art/car.webp",
    "/art/road.webp",
  ]);
  for (const img of container.querySelectorAll('img[src^="/art/"]')) {
    expect([img.getAttribute("alt")?.length, img.hasAttribute("width"), img.hasAttribute("height")]).toEqual([
      expect.any(Number),
      true,
      true,
    ]);
  }
});

it("speaks plain business words above the works-with section, and never shares one login", () => {
  const { container } = renderAt("/");
  const [above, below] = (container.textContent as string).split(WORKS_WITH);

  expect(below).toBeDefined();
  expect(above).toContain(HEADLINE);
  expect(above).toContain("Process is how the work gets done.");
  expect(above).toContain("Reason is why you chose this road.");
  expect(above).not.toMatch(JARGON);
  expect(container.textContent).not.toMatch(/shares? (one|a|the same) (AI )?login/i);
  expect(screen.getAllByRole("heading").map((h) => h.textContent)).not.toContainEqual(
    expect.stringMatching(/AI teammate/i),
  );
});

it("calls a visitor to act once, after the FAQ, with the install button and the GitHub link", () => {
  const { container } = renderAt("/");
  const [cta, ...others] = [...container.querySelectorAll(".band-card")] as HTMLElement[];

  expect(others).toHaveLength(0);
  expect(cta?.querySelector("h2")?.textContent).toBe("Make it yours");
  expect([cta?.querySelector(".lede")?.textContent, cta?.querySelectorAll(".lede").length]).toEqual([
    START_SMALL,
    1,
  ]);
  expect(cta?.previousElementSibling?.querySelector(".faq")).not.toBeNull();
  expect(links(cta as HTMLElement)).toEqual(ACTIONS);
  expect(cta?.nextElementSibling).toBeNull();
});

it("shows what works with each assistant: a card per agent, another assistant with its limit, the switch line, and the install button", () => {
  renderAt("/");
  const section = screen.getByRole("heading", { level: 2, name: WORKS_WITH }).closest("section") as HTMLElement;
  expect(section.querySelector(".lede")?.textContent).toBe("The WongStack framework works with any model or setup through a coding agent that can read and change files and run commands.");
  const SET_UP = "Set up on day one: your skills are ready, and memory loads by itself in every chat.";

  expect(AGENTS.length).toBeGreaterThan(1);
  expect(
    [...section.querySelectorAll(".works > article")].map((card) => [
      card.querySelector("h3")?.textContent,
      card.querySelector("h3 img")?.getAttribute("src"),
      card.querySelector("h3 img")?.getAttribute("alt"),
      card.querySelector("p")?.textContent,
    ]),
  ).toEqual([
    ...AGENTS.map(({ name, logo }) => [name, `/logos/${logo}.svg`, "", SET_UP]),
    [
      "Another assistant",
      undefined,
      undefined,
      "It reads the same files, so your skills work. It looks memory up when you ask.",
    ],
  ]);
  const note = section.querySelector(".works + p") as HTMLElement;
  expect([note.textContent, note.className]).toEqual([
    "Switch any time. Your skills, memory, and apps stay in your folder and your accounts.",
    "note",
  ]);
  expect(links(section)).toEqual(["Install for free #install"]);
  expect(section.lastElementChild?.className).toBe("button");
  // The chart sits in its own section, just before this one.
  expect(within(section).queryAllByRole("table")).toHaveLength(0);
  expect(section.previousElementSibling?.querySelector("table.compare")).not.toBeNull();
});

it("answers a team owner's questions, naming both ways to install and what each costs, without claiming Anthropic's approval", () => {
  const { container } = renderAt("/");
  const faq = container.querySelector(".faq") as HTMLElement;
  const answer = (question: string) =>
    [...faq.querySelectorAll("details")]
      .find((d) => d.querySelector("summary")?.textContent === question)
      ?.querySelector("p")?.textContent;

  expect([...faq.querySelectorAll("summary")].map((s) => s.textContent)).toEqual([
    "Is WongStack free?",
    "Why is it free?",
    "What does setup need?",
    "Do I need to know how to code?",
    "What can I ask it to do?",
    "How does my team use it?",
    "Is my business's data safe?",
    "What does it cost, with AI?",
    "Will Anthropic ban my Claude account?",
    "What if I stop using it?",
  ]);
  expect(answer("Is WongStack free?")).toBe(
    `Yes. The software is free and open source, and installs on your own computer with one message. You use your own AI plan and ${freeAccounts()}. On Mac or Linux you can keep everything in Cloudflare alone instead, on Cloudflare's paid plan, about $5 a month.`,
  );
  expect(answer("Do I need to know how to code?")).toMatch(/^No\. You ask in plain words/);
  expect(answer("How does my team use it?")).toContain("Each person signs in to their own AI plan.");
  expect(answer("How does my team use it?")).toContain(
    "Your team can work in shared projects and build on shared knowledge, with access you choose.",
  );
  // Adding a teammate who publishes is not built, so no answer promises it.
  expect(faq.textContent).not.toMatch(/\b(everyone|each person|your team|teammates?) (can )?publish/i);
  expect(answer("Is my business's data safe?")).toBe(
    "Your code, apps, and memory sit in your own accounts, and your AI login stays on your own computer. Nothing passes through us.",
  );
  expect(answer("What does it cost, with AI?")).toBe(
    "The software is free. Each person uses their own AI plan, such as Claude or ChatGPT, so there's no markup on AI and no per-seat fee. Cloudflare's paid plan, about $5 a month, is needed only to keep everything in Cloudflare alone or to run jobs on a schedule.",
  );
  const anthropic = answer("Will Anthropic ban my Claude account?");
  expect(anthropic).toMatch(/^If you use Claude: WongStack works with the official, unmodified Claude Code on your own computer\./);
  expect(anthropic).toContain("You sign in to Claude yourself, and we never see or keep your login.");
  expect(anthropic).toContain("We do not resell Claude usage");
  expect(answer("What if I stop using it?")).toBe(
    "Everything is plain files in accounts you own: your code, your apps, and what it learned. It all stays yours.",
  );
  expect(faq.textContent).not.toMatch(/approv|endorse|partner/i);
  expect(container.textContent).not.toMatch(/endorse|partner/i);
});

it("puts the logo and name, the GitHub link, and the install link in the header, and no star link", () => {
  const { container } = renderAt("/somewhere-else");
  const header = container.querySelector("header") as HTMLElement;

  const home = screen.getByRole("link", { name: "WongStack" });
  expect(home.getAttribute("href")).toBe("/");
  expect(home.querySelector("img")?.getAttribute("src")).toBe("/favicon.svg");
  expect(home.textContent).toBe("WongStack");
  expect(
    within(header)
      .getAllByRole("link")
      .map((link) => [link.textContent, link.getAttribute("href")]),
  ).toEqual([
    ["WongStack", "/"],
    ["GitHub", REPO_URL],
    ["Install", "/#install"],
  ]);
  expect(header.textContent).not.toContain("Star");
  screen.getByText(HEADLINE);
});

it("serves the privacy page at /privacy: who runs the site, then four short sections", () => {
  renderAt("/privacy");
  const article = screen.getByRole("article");
  const text = article.textContent;

  within(article).getByRole("heading", { level: 1, name: "Privacy" });
  within(article).getByText("Last updated October 4, 2026");
  expect(
    within(article)
      .getAllByRole("heading", { level: 2 })
      .map((h) => h.textContent),
  ).toEqual(["This site", "The software", "If you email us", "Questions"]);
  expect(text).toContain("Matthew Wong, doing business as WongStack, runs this site and makes the software.");
  expect(text).toContain("This site has no sign-in. It sets no cookies. It uses no analytics, no tracking, and no ads.");
  expect(text).toContain("Cloudflare delivers these pages, so it handles each request, your IP address included.");
  expect(text).toContain("Every file a page loads comes from this site.");
  expect(text).toContain("WongStack runs on your own computer and in accounts you own.");
  expect(text).toContain("Your code, your files, your chats, and your AI logins never reach us.");
  expect(text).toContain("We keep your email so we can answer it. We use it for nothing else.");
  expect(text).toContain(
    "To ask what we hold about you, or to have an email deleted, write to support@wongstack.com.",
  );
  expect(links(article)).toEqual(["support@wongstack.com mailto:support@wongstack.com"]);
  expect(within(article).queryAllByRole("button")).toHaveLength(0);
  expect(within(article).queryAllByRole("table")).toHaveLength(0);
  expect(screen.queryByText(HEADLINE)).toBeNull();
});

it("serves the privacy page with a trailing slash, and only there", () => {
  renderAt("/privacy/");
  screen.getByRole("heading", { level: 1, name: "Privacy" });
  cleanup();
  renderAt("/xprivacy");
  screen.getByText(HEADLINE);
  cleanup();
  renderAt("/privacy/more");
  screen.getByText(HEADLINE);
});

it.each(["/", "/privacy", "/pricing"])("ends %s with the license, the privacy page, and the contact, and no terms", (path) => {
  renderAt(path);
  expect(
    within(screen.getByRole("contentinfo"))
      .getAllByRole("link")
      .map((link) => [link.textContent, link.getAttribute("href")]),
  ).toEqual([
    ["License", `${REPO_URL}/blob/main/LICENSE`],
    ["Privacy", "/privacy"],
    ["support@wongstack.com", "mailto:support@wongstack.com"],
  ]);
});

// Addresses the earlier hosted app served. Each now has no page of its own.
const OLD_ADDRESSES = [
  "/pricing",
  "/pricing/",
  "/login",
  "/login/verify",
  "/terms",
  "/pay",
  "/launch",
  "/join",
  "/dashboard",
  "/dashboard/add",
  "/dashboard/m1",
];

it.each(OLD_ADDRESSES)("shows the landing page, not an error or a sign-in, at the old address %s", (path) => {
  const fetchMock = vi.fn();
  vi.stubGlobal("fetch", fetchMock);
  const { container } = renderAt(path);

  screen.getByRole("heading", { level: 1, name: HEADLINE });
  expect(container.querySelector("section#install")).not.toBeNull();
  expect(container.querySelector("article.legal")).toBeNull();
  // The page asks no one anything: it only shows what it was built with.
  expect(fetchMock).not.toHaveBeenCalled();
});
