import { Fragment, useState, type ReactNode } from "react";
import { Chips, YourApps } from "./apps";
import { Compare } from "./Compare";
import { CopyMessage } from "./CopyButton";
import { ACCOUNTS, ADD_ONS, AGENTS, INSTALL_PROMPT, REPO_URL, STEPS, computers, freeAccounts } from "./install";
import { InstallButton } from "./InstallButton";
import { Bubbles, PaseoShot } from "./mockups";

const HEADLINE = "One place for AI to build, remember, and get things done.";
const DESCRIPTION = "You own everything: your code, your apps, your data, and what it learns. Free and open source.";

/** Under each Paseo screenshot: the pictures show one chat app, and none is needed. */
const SHOWS_PASEO = "These screens show Paseo, the chat app I use. WongStack works wherever your assistant works.";

/** The closing call to action's last line. */
const FOR_EVERYONE = "GitHub is for engineers. This is the next one, for everyone else.";

/** Small gray pills, as in a point's picture. */
const Pills = ({ items }: { items: string[] }) => (
  <p className="pills">
    {items.map((item) => (
      <span key={item}>{item}</span>
    ))}
  </p>
);

/** The AI plans and agents the hero's Supports row names, each with its logo. */
const SUPPORTS = [
  ["Claude", "/logos/claude.svg"],
  ["ChatGPT", "/logos/openai.svg"],
];

function Supports() {
  return (
    <ul className="supports">
      <li>Supports</li>
      {SUPPORTS.map(([name, logo]) => (
        <li key={name}>
          <img src={logo} alt="" />
          {name}
        </li>
      ))}
      <li>+ any model with an API key</li>
    </ul>
  );
}

// Each point's picture, `public/art/<art>.webp`, was made once with Gemini
// (gemini-3.1-flash-image, 16:9), then resized to 960 px wide webp. Remake one
// from its prompt below plus the shared style: "minimal line illustration,
// soft white and gray lines on a near-black background, no text, no logos,
// generous empty space".
// - shared-memory: Three people at their own laptops, each linked by thin
//   lines to one shared open notebook in the middle
// - browser-use: A browser window with a cursor clicking a button, and beside
//   it a phone showing a message with a link
// - best-practices: Neat stacked building blocks on a blueprint grid, with a
//   padlock, a key, a check mark, and a plain database cylinder with no letters
// - company-brain: A brain outline made of connected notes and small gears,
//   with a few notes being tidied into place
const POINTS: { title: string; text: string; art: string; visual: ReactNode }[] = [
  {
    title: "Shared memory",
    art: "shared-memory",
    text: "Your whole team works in the same projects, each with their own AI plan. What one person teaches it, everyone gets.",
    visual: (
      <>
        <Bubbles chat={[["agent", "Noted for the team: orders ship on Fridays, and the ops lead signs off."]]} />
        <p className="note">Updated memory</p>
      </>
    ),
  },
  {
    title: "Browser use",
    text: "It opens a real browser to click through your apps and check its own work. When it needs you, to sign in or approve something, it sends you a link.",
    art: "browser-use",
    visual: <Bubbles chat={[["agent", "I need you to sign in to Shopify once. Open this link."]]} />,
  },
  {
    title: "A codebase that follows best practices",
    art: "best-practices",
    text: "Every app is built the same careful way. Tests, checks, sign-in, secret keys, hosting, and a database each have a set way, already decided, so you just build.",
    visual: <Pills items={["Tests", "Checks", "Sign-in", "Secret keys", "Hosting", "Database"]} />,
  },
  {
    title: "Your tools and knowledge, together.",
    art: "company-brain",
    text: "Your code, docs, wiki, and AI memory form one connected workspace. Your AI can understand how your business works, improve the tools that run it, and carry what it learns into the next task.",
    visual: <p className="note">Reads your packing guide → Builds your checklist</p>,
  },
];

// Each open-source library: its name, its repository, its logo, and what it
// does for you. Most GitHub stars first, as counted on 2026-09-28: OpenSpec
// 70.6k, agent-browser 43.3k, Paseo 18.9k. Reorder by hand when that changes.
// agent-browser has no logo of its own, so it shows its maker's, Vercel's.
const OPEN_SOURCE = [
  ["OpenSpec", "Fission-AI/OpenSpec", "openspec", "Plans each change and writes down why, before anything is built."],
  ["agent-browser", "vercel-labs/agent-browser", "vercel", "Lets the agent use a real browser, like a person would."],
  ["Paseo", "getpaseo/paseo", "paseo", "The chat app I use, on phone and laptop. Optional."],
];

// The two groups under "free and open source": each item's name, its link, its
// logo, and what it does for you. The infrastructure is the accounts the
// install asks for, so it follows install.ts.
const STACK = [
  {
    title: "Open source libraries",
    items: OPEN_SOURCE.map(([name, repo, logo, does]) => [name, `https://github.com/${repo}`, logo, does]),
  },
  { title: "Infrastructure", items: ACCOUNTS.map(({ name, href, logo, does }) => [name, href, logo, does]) },
];

/** The Paseo phone screens, in order: each button's name, its screenshot, and its bold line and sentence. */
const PHONE_SCREENS = [
  {
    name: "Chat",
    src: "/paseo/phone.webp",
    alt: "Paseo on a phone: a chat with the agent, asking which of four next steps to take",
    lead: "Ask in plain words.",
    text: "It asks which step to take when it needs you, and keeps working when you walk away.",
  },
  {
    name: "Plan review",
    src: "/paseo/review.webp",
    alt: "Paseo on a phone: the agent's plan to review, with numbered changes and a Note button beside each",
    lead: "Review a short plan first.",
    text: "Tap Note on anything you'd change before it builds.",
  },
  {
    name: "Changes",
    src: "/paseo/changes.webp",
    alt: "Paseo on a phone: the files a change touched, each with the lines it added and removed",
    lead: "See every change.",
    text: "Each file it touched, and how much, before it goes live.",
  },
  {
    name: "Files",
    src: "/paseo/files.webp",
    alt: "Paseo on a phone: the folders and files in a project",
    lead: "Look through everything.",
    text: "Every file in your project, from your phone.",
  },
  {
    name: "Workspaces",
    src: "/paseo/workspaces.webp",
    alt: "Paseo on a phone: a list of workspaces, with several tasks running at once and whether each one's checks passed",
    lead: "Run several jobs at once.",
    text: "Each task gets its own workspace, and shows when its checks pass. Then it sends a link to try.",
  },
];

/** "Built by chatting, from my phone": one button per Paseo phone screen, the pressed one's screenshot beside its line, over the note that says whose app it is. */
function PhoneTour() {
  const [open, setOpen] = useState(0);
  const { src, alt, lead, text } = PHONE_SCREENS[open] as (typeof PHONE_SCREENS)[number];
  return (
    <section className="split band-shade">
      <div>
        <h2>Built by chatting, from my phone</h2>
        <Chips names={PHONE_SCREENS.map((screen) => screen.name)} pressed={open} onPress={setOpen} />
        <p className="lede">
          <b>{lead}</b> {text}
        </p>
      </div>
      <div className="phones">
        <PaseoShot key={src} src={src} alt={alt} width={640} height={1386} lazy />
        <p className="note">{SHOWS_PASEO}</p>
      </div>
    </section>
  );
}

// The questions, for a free install on your own computer. The first answer
// names the accounts through install.ts.
const FAQ = [
  [
    "Is WongStack free?",
    `Yes. The software is free and open source, and installs on your own computer with one message. You use your own AI plan and ${freeAccounts()}.`,
  ],
  ["Why is it free?", "I built it to run my own company, and I want everyone to have the same tools."],
  [
    "Do I need to know how to code?",
    "No. You ask in plain words, like messaging a coworker. It builds, checks its work, and sends a link to try.",
  ],
  [
    "What can I ask it to do?",
    "Build tools your team uses, like a packing checklist, a profit report, or an ad brief. Research, write, and keep notes on how your business runs. Run jobs on a schedule.",
  ],
  [
    "How does my team use it?",
    "Each person signs in to their own AI plan. Everyone works in the same projects and shares the same memory, so what one person teaches it, the whole team gets.",
  ],
  [
    "Is my business's data safe?",
    "Your code, apps, and memory sit in your own accounts, and your AI login stays on your own computer. Nothing passes through us.",
  ],
  [
    "What does it cost, with AI?",
    "The software is free. Each person uses their own AI plan, such as Claude or ChatGPT, so there's no markup on AI and no per-seat fee.",
  ],
  [
    "Will Anthropic ban my Claude account?",
    "If you use Claude: WongStack works with the official, unmodified Claude Code on your own computer. You sign in to Claude yourself, and we never see or keep your login. We do not resell Claude usage: you use your own plan.",
  ],
  [
    "What if I stop using it?",
    "Everything is plain files in accounts you own: your code, your apps, and what it learned. It all stays yours.",
  ],
];

/** The two lines beside Matt's photo in "Why I built this". */
const ABOUT = [
  "I'm Matt. I run Claymoo, a clay-kit company. WongStack is the setup we use there for almost everything.",
  "AI is moving fast. I want everyone to have the same tools, and to see what AI can do, so we all take AI safety seriously.",
];

/** "Why I built this": Matt's photo beside who he is and why WongStack exists; on a phone, the photo sits above. */
function About() {
  return (
    <section className="band about">
      <h2>Why I built this</h2>
      <div>
        <img src="/me.webp" alt="Matt Wong" width={160} height={160} />
        <div>
          {ABOUT.map((text) => (
            <p key={text}>{text}</p>
          ))}
        </div>
      </div>
    </section>
  );
}

/** "Install for free", which scrolls to the install steps, and the code a quiet link away: the hero and the closing call to action share them. */
function Actions() {
  return (
    <p className="actions">
      <InstallButton />
      <a className="more" href={REPO_URL}>
        See it on GitHub →
      </a>
    </p>
  );
}

/** The three numbered install steps, with the message to copy in the second. */
function InstallSteps() {
  return (
    <ol className="install">
      <li>
        <p>
          {STEPS.open}
          {AGENTS.map(({ name, href }, i) => (
            <Fragment key={name}>
              {i ? " or " : " "}
              <a href={href}>{name}</a>
            </Fragment>
          ))}
        </p>
      </li>
      <li>
        <p>{STEPS.paste}</p>
        <div className="install-message">
          <CopyMessage text={INSTALL_PROMPT} />
        </div>
      </li>
      <li>
        <p>{STEPS.answer}</p>
      </li>
    </ol>
  );
}

/** "Optional, once it works": the add-ons under the install steps. */
function InstallExtras() {
  return (
    <div className="extras">
      <h3>Optional, once it works</h3>
      <ul>
        {ADD_ONS.map(({ name, href, enables }) => (
          <li key={name}>
            <a href={href}>{name}</a>
            <p>{enables}</p>
          </li>
        ))}
      </ul>
    </div>
  );
}

/** The one call to action after the FAQ. */
function Cta() {
  return (
    <section className="band band-card">
      <h2>Make it yours</h2>
      <p className="lede">
        {DESCRIPTION} {FOR_EVERYONE}
      </p>
      <Actions />
    </section>
  );
}

function Stack() {
  return (
    <section className="band band-shade">
      <h2>WongStack is free and open source.</h2>
      <p className="lede">Every part is yours to keep, change, or move.</p>
      <div className="grid stack">
        {STACK.map(({ title, items }) => (
          <article className="card" key={title}>
            <h3>{title}</h3>
            <ul>
              {items.map(([name, href, logo, does]) => (
                <li key={name}>
                  <img src={`/logos/${logo}.svg`} alt="" />
                  <a href={href}>{name}</a>
                  <p>{does}</p>
                </li>
              ))}
            </ul>
          </article>
        ))}
      </div>
    </section>
  );
}

export function Landing() {
  return (
    <>
      <section className="band hero">
        <h1>{HEADLINE}</h1>
        <p className="lede">{DESCRIPTION}</p>
        <Actions />
        <Supports />
        <PaseoShot
          src="/paseo/laptop.webp"
          alt="Paseo on a laptop: a list of workspaces, a chat with the agent, and its plan with choices to pick from"
          width={1600}
          height={902}
        />
        <p className="note">{SHOWS_PASEO}</p>
      </section>

      <About />
      <PhoneTour />

      <section className="band">
        <h2>The hardest part is the setup. It's done.</h2>
        <p className="lede">
          Everything a developer would spend weeks setting up is ready on day one, in accounts you own, so your data
          stays yours.
        </p>
        <div className="grid points">
          {POINTS.map(({ title, text, art, visual }) => (
            <article className="card" key={title}>
              <div className="visual">
                <img src={`/art/${art}.webp`} alt="" width={960} height={536} loading="lazy" />
                <div>{visual}</div>
              </div>
              <h3>{title}</h3>
              <p>{text}</p>
            </article>
          ))}
        </div>
        <InstallButton />
      </section>

      <YourApps />

      <Compare />
      <Stack />

      <section className="band" id="install">
        <h2>Install it for free</h2>
        <p className="lede">It runs on your own computer, with your own AI plan.</p>
        <InstallSteps />
        <p className="note">
          Works on {computers()}. You need {freeAccounts()}.
        </p>
        <InstallExtras />
      </section>

      <section className="band band-shade">
        <h2>Questions</h2>
        <div className="faq">
          {FAQ.map(([question, answer]) => (
            <details key={question}>
              <summary>{question}</summary>
              <p>{answer}</p>
            </details>
          ))}
        </div>
      </section>

      <Cta />
    </>
  );
}
