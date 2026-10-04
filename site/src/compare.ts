// "How WongStack compares": one column per product, WongStack first, and one
// row per feature a buyer weighs, with a yes or no from each product. Check
// every mark against the source beside the product and update CHECKED; a
// wrong claim about another company's product is a liability. "Not stated"
// counts as no. Drop a row every product has.
// Logos: LobeHub icons (MIT), one color; Muse shows Meta's mark.

export const CHECKED = "September 2026";

export const CHECKLIST = [
  "Uses websites for you",
  "Keeps working in the background",
  "Builds and hosts your apps",
  "Team shares one memory",
  "Your data stays in your accounts",
  "Uses your Claude or ChatGPT plan",
  "Open source",
];

export const PRODUCTS = [
  { name: "WongStack", logo: "/favicon.svg", marks: [true, true, true, true, true, true, true] },
  // docs.x.ai/grok-bot/overview: runs on a cloud computer in Cursor's cloud;
  // "conversations and learned context stay separate per Bot".
  // docs.x.ai/grok-bot/bots: a shared Bot is a copy, without your history.
  // docs.x.ai/grok-bot/teams-and-enterprises: "Cursor manages model selection".
  // x.ai/bot: "uses your apps and websites just like you would"; AI
  // teammates "keep working 24/7". No app hosting and no source code stated.
  { name: "Grok Bot", logo: "/logos/grok.svg", marks: [true, true, false, false, false, false, false] },
  // about.fb.com/news/2026/09/introducing-muse-personal-ai-agent: a personal
  // agent on "its own dedicated computer in the cloud", powered by Meta's Muse
  // Spark. "It can open a browser, fill out forms"; "Muse keeps working after
  // people close the app". No app hosting, team memory, or source code stated.
  { name: "Muse", logo: "/logos/meta.svg", marks: [true, true, false, false, false, false, false] },
  // docs.openclaw.ai: self-hosted, "a shared team deployment", MIT licensed;
  // memory is Markdown in the agent's workspace (concepts/memory); no app
  // hosting stated. docs.openclaw.ai/concepts/oauth: Claude CLI reuse and
  // ChatGPT (Codex) OAuth. tools/browser: "a dedicated Chrome/Brave/Edge/
  // Chromium profile that the agent controls"; automation: "Run work on a
  // schedule with cron jobs, hooks, and webhooks".
  { name: "OpenClaw", logo: "/logos/openclaw.svg", marks: [true, true, false, true, true, true, true] },
  // docs.lovable.dev: publishes to a live URL on Lovable; workspace knowledge
  // is shared by every project in a workspace (features/knowledge); apps run
  // on Lovable Cloud, code syncs to your GitHub; uses its own credits; not
  // open source; no browsing for you or background work stated.
  { name: "Lovable", logo: "/logos/lovable.svg", marks: [false, false, true, true, false, false, false] },
];
