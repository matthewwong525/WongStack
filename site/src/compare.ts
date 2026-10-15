// Another product's "yes" needs a quote read word for word on its own page; else "not-stated", never "no".
// How to keep it true: wiki/maintaining/landing-page.md. Logos: LobeHub icons (MIT); Muse shows Meta's.

export const CHECKED = "October 2026";

export const KINDS = ["Data, in one place you own", "Process, as code you own", "Reason, saved from your chats"];

export type Mark = "yes" | "not-stated";

/** The page behind a "yes", and its words. */
export type Source = { url: string; quote: string };

export type Product = {
  name: string;
  logo: string;
  /** One mark per kind, in KINDS's order. */
  marks: Mark[];
  /** Beside each mark: the source of a "yes", or null for "not-stated". WongStack's own column has none. */
  sources?: (Source | null)[];
};

const NOT_STATED = null;

export const PRODUCTS: Product[] = [
  { name: "WongStack", logo: "/favicon.svg", marks: ["yes", "yes", "yes"] },
  {
    name: "OpenClaw",
    logo: "/logos/openclaw.svg",
    marks: ["not-stated", "yes", "yes"],
    sources: [
      NOT_STATED,
      {
        url: "https://docs.openclaw.ai/tools/skills",
        quote:
          "The editor keeps supporting scripts, references, and assets with the instructions. The ordinary single-admin setup stays unchanged: workspace authoring still uses <workspace>/skills",
      },
      {
        url: "https://docs.openclaw.ai/concepts/memory",
        quote: "MEMORY.md — long-term memory. Durable non-profile facts and decisions. Loaded at the start of a session.",
      },
    ],
  },
  {
    name: "Muse",
    logo: "/logos/meta.svg",
    marks: ["not-stated", "not-stated", "yes"],
    sources: [
      NOT_STATED,
      NOT_STATED,
      {
        url: "https://about.fb.com/news/2026/09/introducing-muse-personal-ai-agent/",
        quote:
          "Muse also remembers what matters to a person, so it can make suggestions unprompted and act on details that person only mentioned once.",
      },
    ],
  },
  {
    name: "Grok Bot",
    logo: "/logos/grok.svg",
    marks: ["not-stated", "not-stated", "yes"],
    sources: [
      NOT_STATED,
      NOT_STATED,
      {
        url: "https://docs.x.ai/grok-bot/overview",
        quote: "What does a Bot remember? Stable preferences, role context, and summaries of prior work.",
      },
    ],
  },
  {
    name: "ChatGPT",
    logo: "/logos/openai.svg",
    marks: ["not-stated", "not-stated", "yes"],
    sources: [
      NOT_STATED,
      NOT_STATED,
      {
        url: "https://help.openai.com/en/articles/8590148-memory-faq",
        quote:
          "When Memory is enabled, ChatGPT can remember relevant preferences and details from your chats and other available sources.",
      },
    ],
  },
  {
    name: "Claude",
    logo: "/logos/claude.svg",
    marks: ["not-stated", "not-stated", "yes"],
    sources: [
      NOT_STATED,
      NOT_STATED,
      {
        url: "https://support.claude.com/en/articles/11817273-use-claude-s-chat-search-and-memory-to-build-on-previous-context",
        quote: "Claude saves memory as a set of individual topics as you chat, rather than summarizing conversations after they end.",
      },
    ],
  },
];
