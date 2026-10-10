import { Fragment, type ReactNode } from "react";
import { CopyMessage } from "./CopyButton";
import {
  PASEO,
  AGENTS,
  ASKS_FIRST,
  COST_ANSWERS,
  INSTALL_PROMPT,
  REPO_URL,
  STEPS,
  WAYS,
  computers,
  freeAccounts,
} from "./install";
import { InstallButton } from "./InstallButton";
import { PaseoShot } from "./mockups";
import { Rotator } from "./Rotator";
import { DataScene, KnowledgeScene, OperationsScene, RetentionScene, TeamScene } from "./Story";
import { WorksWith } from "./WorksWith";

/** The headline's fixed line, under the assistant's name that slides: Rotator.tsx. */
const HEADLINE = "for people who don't code.";
const DESCRIPTION =
  "AI tools, set up to run your business. Free and open source, in accounts you own.";

// The questions, for an install on your own computer. The accounts, and every
// word about what a way to install costs, come from install.ts.
const FAQ: [string, ReactNode][] = [
  [
    "Is WongStack free?",
    `Yes. The software is free and open source, and installs on your own computer with one message. You use your own AI plan and ${freeAccounts()}. ${COST_ANSWERS.free}`,
  ],
  ["Why is it free?", "It is open source software you can use, change, and share."],
  [
    "What does setup need?",
    <Fragment key="setup-details">
      <p>Works on {computers()}.</p>
      {WAYS.map(({ name, line }) => <p key={name}>{line}</p>)}
      <p>{ASKS_FIRST}</p>
    </Fragment>,
  ],
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
    "Each person signs in to their own AI plan. Your team can work in shared projects and build on shared knowledge, with access you choose.",
  ],
  [
    "Is my business's data safe?",
    "Your code, apps, and memory sit in your own accounts, and your AI login stays on your own computer. Nothing passes through us.",
  ],
  [
    "What does it cost, with AI?",
    `The software is free. Each person uses their own AI plan, such as Claude or ChatGPT, so there's no markup on AI and no per-seat fee. ${COST_ANSWERS.cost}`,
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

/** The one call to action after the FAQ. */
function Cta() {
  return (
    <section className="band band-card">
      <h2>Make it yours</h2>
      <p className="lede">
        Start with one operational process. Ask your assistant to build a tool around it, then keep what you learn.
      </p>
      <Actions />
    </section>
  );
}

export function Landing() {
  return (
    <>
      <section className="band hero">
        <div className="hero-copy">
          <Rotator line={HEADLINE} />
          <p className="lede">{DESCRIPTION}</p>
          <Actions />
        </div>
        <figure className="hero-picture">
          <PaseoShot
            src="/paseo/laptop.webp"
            alt="Paseo on a laptop: a list of workspaces, a chat with the agent, and its plan with choices to pick from"
            width={1600}
            height={902}
          />
          <figcaption className="note">Shown in <a href={PASEO.href}>{PASEO.name}</a>, an optional chat app.</figcaption>
        </figure>
      </section>

      <KnowledgeScene />
      <OperationsScene />
      <DataScene />
      <RetentionScene />
      <TeamScene />

      <WorksWith />

      <section className="band install-section" id="install">
        <h2>Install it for free</h2>
        <p className="lede">It runs on your own computer, with your own AI plan.</p>
        <InstallSteps />
      </section>

      <section className="band band-shade">
        <h2>Questions</h2>
        <div className="faq">
          {FAQ.map(([question, answer]) => (
            <details key={question}>
              <summary>{question}</summary>
              {typeof answer === "string" ? <p>{answer}</p> : answer}
            </details>
          ))}
        </div>
      </section>

      <Cta />
    </>
  );
}
