// The landing page from top to bottom, the privacy page, the header and footer, and which
// address shows which page. Landing.test.tsx covers the install section; Site.test.tsx
// covers the rules every page keeps.
import { cleanup, render, screen, within } from "@testing-library/react";
import { afterEach, expect, it, vi } from "vitest";
import App from "./App";
import { ACCOUNTS, AGENTS, REPO_URL, freeAccounts } from "./install";

function renderAt(path: string) {
  window.history.pushState({}, "", path);
  return render(<App />);
}

afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
});

// What a screen reader reads as the headline: every name, then the fixed line.
const HEADLINE = "Claude Code or Codex, for people who don't code.";
const FIXED_LINE = "for people who don't code.";
const WORKS_WITH = "Works with the AI you already use";
const SHOWS_PASEO = "These screens show Paseo, the chat app I use. WongStack works wherever your assistant works.";
const FOR_EVERYONE = "GitHub is for engineers. This is the next one, for everyone else.";
const DESCRIPTION =
  "The most powerful AI tools, set up for your business, with security built in. Open source, and everything it builds and learns stays in accounts you own.";

// Developer words the page keeps out of its copy above the works-with section.
const JARGON = /\b(repos?|pull requests?|deploy\w*)\b|\b(PR|CI)\b/;

/** The install button and the quiet link to the code: the hero and the closing call to action share them. */
const ACTIONS = ["Install for free #install", `See it on GitHub → ${REPO_URL}`];

/** Each stack item's one logo (decorative, so no label), its linked name, and its line. */
const stackItems = (group: HTMLElement) =>
  [...group.querySelectorAll("li")].map((li) => {
    const [logo, ...others] = [...li.querySelectorAll("img")];
    expect([others.length, logo?.getAttribute("alt")]).toEqual([0, ""]);
    return [
      logo?.getAttribute("src"),
      li.querySelector("a")?.textContent,
      li.querySelector("a")?.getAttribute("href"),
      li.querySelector("p")?.textContent,
    ];
  });

/** A Paseo screenshot's file and its label. */
const paseo = (shot: Element) => [shot.getAttribute("src"), shot.getAttribute("alt")];

const links = (root: Element | null) =>
  [...(root?.querySelectorAll("a") ?? [])].map((a) => `${a.textContent} ${a.getAttribute("href")}`);

it("opens with a headline that slides through the assistants the install steps name, and reads as one sentence", () => {
  const { container } = renderAt("/");
  const h1 = screen.getByRole("heading", { level: 1, name: HEADLINE });
  const [hidden, seen] = [...h1.children] as HTMLElement[];
  const names = AGENTS.map((agent) => agent.name);

  // A screen reader reads one sentence that names them all, and skips the moving rows.
  expect(h1.children).toHaveLength(2);
  expect([hidden?.className, hidden?.textContent]).toEqual(["sr-only", HEADLINE]);
  expect(seen?.getAttribute("aria-hidden")).toBe("true");
  // Every product the sentence names is one the install steps name: nothing is left once they are taken out.
  expect(names.length).toBeGreaterThan(1);
  let rest = HEADLINE;
  for (const name of names) {
    expect([name, rest.includes(name)]).toEqual([name, true]);
    rest = rest.replace(name, "");
  }
  expect(rest).toBe(` or , ${FIXED_LINE}`);
  for (const other of ["WongStack", "Grok", "Dots", "ChatGPT", "Paseo"]) {
    expect([other, h1.textContent?.includes(other)]).toEqual([other, false]);
  }
  // The rows: each name beside its own logo, in the list's order, then the first again so the loop is seamless.
  const rows = [...h1.querySelectorAll(".rotator-window .rotator-row")];
  expect(rows.map((row) => [row.textContent, row.querySelector("img")?.getAttribute("src"), row.querySelector("img")?.getAttribute("alt")])).toEqual(
    [...AGENTS, ...AGENTS.slice(0, 1)].map(({ name, logo }) => [name, `/logos/${logo}.svg`, ""]),
  );
  // A visitor who asks for less motion sees the first row, still: index.css stops the slide.
  expect(rows[0]?.textContent).toBe("Claude Code");
  expect(seen?.lastElementChild?.textContent).toBe(FIXED_LINE);
  expect(container.querySelector(".hero")?.firstElementChild).toBe(h1);
  expect(container.querySelectorAll("h1")).toHaveLength(1);
});

it("opens with the offer, the install button, the GitHub link, the Supports row, and a Paseo laptop screenshot over a note that it is the app I use", () => {
  const { container } = renderAt("/");
  const hero = container.querySelector(".hero") as HTMLElement;
  expect(hero.querySelectorAll(".lede")).toHaveLength(1);
  expect(within(hero).getByText(DESCRIPTION).className).toBe("lede");
  // "Install for free" goes down to the install steps, not the steps themselves; Landing.test.tsx checks the steps.
  expect(links(hero.querySelector(".lede + p.actions"))).toEqual(ACTIONS);
  const supports = hero.querySelector(".supports") as HTMLElement;
  expect(
    [...supports.querySelectorAll("li")].map((li) => [li.textContent, li.querySelector("img")?.getAttribute("src")]),
  ).toEqual([
    ["Supports", undefined],
    ["Claude", "/logos/claude.svg"],
    ["ChatGPT", "/logos/openai.svg"],
    ["+ any model with an API key", undefined],
  ]);
  expect(within(supports).queryAllByRole("link")).toHaveLength(0);
  expect(hero.textContent).not.toMatch(/Built by|Official, unmodified/);
  const note = hero.lastElementChild as Element;
  expect([note.textContent, note.className]).toEqual([SHOWS_PASEO, "note"]);
  expect(paseo(note.previousElementSibling as Element)).toEqual([
    "/paseo/laptop.webp",
    "Paseo on a laptop: a list of workspaces, a chat with the agent, and its plan with choices to pick from",
  ]);
  expect(hero.nextElementSibling?.querySelector("h2")?.textContent).toBe("Why I built this");
  expect(container.querySelectorAll('a[href*="claymoo" i]')).toHaveLength(0);
});

it("orders the page: about, Paseo phones, what's included, examples, works with, stack, install, FAQ, one call to action", () => {
  const { container } = renderAt("/");
  const points = container.querySelector(".points") as HTMLElement;
  const headings = screen.getAllByRole("heading", { level: 2 });
  const phones = headings[1]?.closest("section") as HTMLElement;

  expect(headings.map((h) => h.textContent)).toEqual([
    "Why I built this",
    "Built by chatting, from my phone",
    "The hardest part is the setup. It's done.",
    "Examples of things I've done",
    WORKS_WITH,
    "WongStack is free and open source.",
    "Install it for free",
    "Questions",
    "Make it yours",
  ]);
  // The text comes first, so on a wide screen it sits left of the phone.
  expect(phones.firstElementChild?.querySelector("h2")?.textContent).toBe("Built by chatting, from my phone");
  expect([...container.querySelectorAll('img[src^="/paseo/"]')].map(paseo)).toHaveLength(2);
  // Each Paseo picture sits over the same note: it is the app I use, and none is needed.
  expect(
    [...container.querySelectorAll('img[src^="/paseo/"]')].map((shot) => [
      shot.nextElementSibling?.textContent,
      shot.nextElementSibling?.className,
    ]),
  ).toEqual([
    [SHOWS_PASEO, "note"],
    [SHOWS_PASEO, "note"],
  ]);
  screen.getByText(
    "Everything a developer would spend weeks setting up is ready on day one, in accounts you own, so your data stays yours.",
  );
  expect(
    [...points.querySelectorAll("article")].map((card) => [
      card.querySelector("h3")?.textContent,
      card.querySelector(":scope > p")?.textContent,
      card.querySelector(".visual")?.textContent,
      ...["src", "alt", "loading"].map((name) => card.querySelector(".visual > img")?.getAttribute(name)),
    ]),
  ).toEqual([
    [
      "Shared memory",
      "Your whole team works in the same projects, each with their own AI plan. What one person teaches it, everyone gets.",
      "Noted for the team: orders ship on Fridays, and the ops lead signs off.Updated memory",
      "/art/shared-memory.webp",
      "",
      "lazy",
    ],
    [
      "Browser use",
      "It opens a real browser to click through your apps and check its own work. When it needs you, to sign in or approve something, it sends you a link.",
      "I need you to sign in to Shopify once. Open this link.",
      "/art/browser-use.webp",
      "",
      "lazy",
    ],
    [
      "A codebase that follows best practices",
      "Every app is built the same careful way. Tests, checks, sign-in, secret keys, hosting, and a database each have a set way, already decided, so you just build.",
      "TestsChecksSign-inSecret keysHostingDatabase",
      "/art/best-practices.webp",
      "",
      "lazy",
    ],
    [
      "Your tools and knowledge, together.",
      "Your code, docs, wiki, and AI memory form one connected workspace. Your AI can understand how your business works, improve the tools that run it, and carry what it learns into the next task.",
      "Reads your packing guide → Builds your checklist",
      "/art/company-brain.webp",
      "",
      "lazy",
    ],
  ]);
});

it("speaks plain business words above the works-with section, and never shares one login", () => {
  const { container } = renderAt("/");
  const [above, below] = (container.textContent as string).split(WORKS_WITH);

  expect(below).toBeDefined();
  expect(above).toContain(HEADLINE);
  expect(above).toContain("Why I built this");
  expect(above).toContain("Examples of things I've done");
  expect(above).toContain("Built by chatting, from my phone");
  expect(above).toContain("The hardest part is the setup. It's done.");
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
    `${DESCRIPTION} ${FOR_EVERYONE}`,
    1,
  ]);
  expect(cta?.previousElementSibling?.querySelector(".faq")).not.toBeNull();
  expect(links(cta as HTMLElement)).toEqual(ACTIONS);
  expect(cta?.nextElementSibling).toBeNull();
});

it("shows what works with each assistant: a card per agent, another assistant with its limit, the switch line, and the install button", () => {
  const { container } = renderAt("/");
  const section = screen.getByRole("heading", { level: 2, name: WORKS_WITH }).closest("section") as HTMLElement;
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
  // No table of other products, and no mark for or against one, anywhere on the page.
  expect(within(section).queryAllByRole("table")).toHaveLength(0);
  expect(container.querySelectorAll(".legend, [role=img][aria-label]")).toHaveLength(0);
});

it("names the open-source libraries and the accounts the install asks for, each with its logo and what it does, and no star counts", () => {
  const { container } = renderAt("/");
  const [open, infra, ...rest] = [...container.querySelectorAll(".stack article")] as HTMLElement[];

  screen.getByRole("heading", { level: 2, name: "WongStack is free and open source." });
  expect(rest).toHaveLength(0);
  expect(open?.querySelector("h3")?.textContent).toBe("Open source libraries");
  expect(stackItems(open as HTMLElement)).toEqual([
    [
      "/logos/openspec.svg",
      "OpenSpec",
      "https://github.com/Fission-AI/OpenSpec",
      "Plans each change and writes down why, before anything is built.",
    ],
    [
      "/logos/vercel.svg",
      "agent-browser",
      "https://github.com/vercel-labs/agent-browser",
      "Lets the agent use a real browser, like a person would.",
    ],
    [
      "/logos/paseo.svg",
      "Paseo",
      "https://github.com/getpaseo/paseo",
      "The chat app I use, on phone and laptop. Optional.",
    ],
  ]);
  expect(open?.textContent).not.toMatch(/WongStack|Claude Code|Codex|OpenCode|Wrangler|GitHub CLI/);
  expect(container.textContent).not.toMatch(/Official|Ubuntu|Node\.js|Yours/);
  expect(infra?.querySelector("h3")?.textContent).toBe("Infrastructure");
  // The accounts come from install.ts, so a new install route changes this list with it.
  expect(stackItems(infra as HTMLElement)).toEqual(
    ACCOUNTS.map((account) => [`/logos/${account.logo}.svg`, account.name, account.href, account.does]),
  );
  expect(ACCOUNTS.length).toBeGreaterThan(0);
  expect(container.textContent).not.toMatch(/\bstars?\b/i);
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
    "Everyone works in the same projects and shares the same memory",
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
