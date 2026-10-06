// Everything the landing page says about installing WongStack: the message to
// paste, the steps, the agents, the accounts, the computers, and the add-on.
// Change how WongStack installs, and this is the one file to edit; no other
// file under src/ names an account, a system, or the message.
//
// It describes the install that works today, never one that is planned.
// wiki/maintaining/landing-page.md

/**
 * The one message a visitor pastes into a new chat. It is the README's fenced
 * message, character for character: scripts/tests/landing-site.test.mjs fails
 * when the two differ, so change both in the same change. That test imports
 * this file with plain Node, so the file imports nothing.
 */
export const INSTALL_PROMPT =
  "Install WongStack from github.com/matthewwong525/WongStack. Read and follow https://raw.githubusercontent.com/matthewwong525/WongStack/refs/heads/main/.agents/skills/wong-setup/SKILL.md";

/** Where the code lives: the header's and hero's GitHub links, and the footer's license. */
export const REPO_URL = "https://github.com/matthewwong525/WongStack";

/** The assistants the first step names as examples, each linked to its own install page, as the README links them. */
export const AGENTS = [
  { name: "Claude Code", href: "https://code.claude.com/docs/en/setup" },
  { name: "Codex", href: "https://developers.openai.com/codex/cli" },
];

/**
 * The three steps, in order. The first says any assistant before it names one:
 * "<open> <agent> or <agent>". The second shows the message.
 */
export const STEPS = {
  open: "Open any assistant that can work on your computer, such as",
  paste: "Paste this into a new chat",
  answer: "Answer a few questions",
};

/** The free accounts the install asks for: each one's name, website, logo in public/logos/, and what it does for you. */
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

/** What a visitor can add once WongStack works, each with what it enables. */
export const ADD_ONS = [
  {
    name: "Add Paseo",
    href: "https://paseo.sh",
    enables: "Chat from your phone, and work on several tasks at once.",
  },
];

/** "a", "a and b", or "a, b, and c". */
const list = (items: string[]) => new Intl.ListFormat("en", { style: "long", type: "conjunction" }).format(items);

/** The computers, as a sentence names them: "Mac, Windows, and Linux". */
export const computers = (names = COMPUTERS) => list(names);

/** The accounts, as a sentence names them: "free GitHub and Cloudflare accounts", or "a free Cloudflare account" when one is left. */
export function freeAccounts(names = ACCOUNTS.map((account) => account.name)) {
  return names.length === 1 ? `a free ${list(names)} account` : `free ${list(names)} accounts`;
}
