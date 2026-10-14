// Everything the landing page says about installing WongStack as it works today, never as planned. No other file
// under src/ names an account, a system, a cost, or the message: wiki/maintaining/landing-page.md

/** The one message a visitor pastes into a new chat: the README's, character for character, as
 * scripts/tests/landing-site.test.mjs checks. That test imports this file with plain Node, so it imports nothing. */
export const INSTALL_PROMPT =
  "Install WongStack from github.com/matthewwong525/WongStack. Read and follow https://raw.githubusercontent.com/matthewwong525/WongStack/refs/heads/main/.agents/skills/wong-setup/SKILL.md";

/** Where the code lives: the header's and hero's GitHub links, and the footer's license. */
export const REPO_URL = "https://github.com/matthewwong525/WongStack";

/** The assistants WongStack sets up, each with its install page and its logo in public/logos/. The first step, the
 * headline and the works-with section read this list. Add one only after it has been tried as a working assistant. */
export const AGENTS = [
  { name: "Claude Code", href: "https://code.claude.com/docs/en/setup", logo: "claude" },
  { name: "Codex", href: "https://developers.openai.com/codex/cli", logo: "openai" },
];

/** The three steps, in order. The first says any assistant before it names one: "<open> <agent> or <agent>". */
export const STEPS = {
  open: "Open any assistant that can work on your computer, such as",
  paste: "Paste this into a new chat",
  answer: "Answer a few questions",
};

/** The free accounts the install asks for: each one's name, website, logo in public/logos/, and what it does. */
export const ACCOUNTS = [
  {
    name: "GitHub",
    href: "https://github.com",
    logo: "github",
    does: "Keeps your code and every change, in your own account.",
  },
  {
    name: "Cloudflare",
    href: "https://www.cloudflare.com",
    logo: "cloudflare",
    does: "Hosts your apps and their data, on your own account.",
  },
];

/** The computers the install works on. */
export const COMPUTERS = ["Mac", "Windows", "Linux"];

/** The optional chat app pictured in the hero, linked only in its caption. */
export const PASEO = { name: "Paseo", href: "https://paseo.sh" };

/** "a", "a and b", or "a, b, and c". */
const list = (items: string[]) => new Intl.ListFormat("en", { style: "long", type: "conjunction" }).format(items);

/** The computers, as a sentence names them: "Mac, Windows, and Linux". */
export const computers = (names = COMPUTERS) => list(names);

/** The accounts, as a sentence names them: "free GitHub and Cloudflare accounts", or "a free Cloudflare account". */
export function freeAccounts(names = ACCOUNTS.map((account) => account.name)) {
  return names.length === 1 ? `a free ${list(names)} account` : `free ${list(names)} accounts`;
}

/** What Cloudflare's paid plan costs: the one figure on the site. The README and the getting-started guide say the
 * same words, and scripts/tests/install-cost.test.mjs fails when one stops: change all three in the same change. */
export const PAID_COST = "about $5 a month";

/** "a or b": the computers a way works on, as its line names them. */
const either = (items: string[]) => new Intl.ListFormat("en", { style: "long", type: "disjunction" }).format(items);

/** The assistants, as the headline's sentence names them: "Claude Code or Codex". */
export const agents = (names = AGENTS.map((agent) => agent.name)) => either(names);

/** A company's paid plan and what it costs, as a sentence names them. */
const paidPlan = (account: string, cost: string) => `${account}'s paid plan, ${cost}`;

/** The way that costs nothing: one account keeps the project, the other runs the apps. */
function freeWay(accounts: [string, string], computers: string[]) {
  const [keeps, runs] = accounts;
  const cost = "free";
  return {
    name: "Free",
    accounts,
    computers,
    cost,
    line: `Free: your project is kept in a ${cost} ${keeps} account, and your apps run in a ${cost} ${runs} account.`,
  };
}

/** The way that needs one account, on that company's paid plan. */
function aloneWay(account: string, computers: string[], cost: string) {
  return {
    name: `${account} alone`,
    accounts: [account],
    computers,
    cost,
    line: `Or keep everything in ${account} alone, on ${either(computers)}: ${paidPlan(account, cost)}.`,
  };
}

const PAID_ACCOUNT = "Cloudflare";
const FREE = freeWay(["GitHub", PAID_ACCOUNT], COMPUTERS);
const ALONE = aloneWay(PAID_ACCOUNT, ["Mac", "Linux"], PAID_COST);
const PAID_PLAN = paidPlan(PAID_ACCOUNT, PAID_COST);
const PAID_COMPUTERS = either(ALONE.computers);

/** The two ways to install, the free one first. `line` is the sentence the page prints in the setup question,
 * built from its own entry, so the two can not disagree. */
export const WAYS = [FREE, ALONE];

/** Beside the setup routes: nobody is charged by surprise. */
export const ASKS_FIRST = `On ${PAID_COMPUTERS}, setup asks which you want before anything costs money.`;

/** The sentence each answer adds about the paid way: "Is WongStack free?", then "What does it cost, with AI?". */
export const COST_ANSWERS = {
  free: `On ${PAID_COMPUTERS} you can keep everything in ${ALONE.name} instead, on ${PAID_PLAN}.`,
  cost: `${PAID_PLAN}, is needed only to keep everything in ${ALONE.name} or to run jobs on a schedule.`,
};

/** Every sentence on the site that speaks of a cost. Site.test.tsx allows these exact strings and no other word
 * about a price or a paid plan, so a new cost sentence is added here or it fails. */
export const COST_LINES = [ALONE.line, ASKS_FIRST, COST_ANSWERS.free, COST_ANSWERS.cost];
