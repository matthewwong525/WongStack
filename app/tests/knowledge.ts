// A small knowledge repository behind a stand-in Artifacts binding, answering the reads the Knowledge app makes.
// Each one starts at a commit of its own, so what one test's reads kept never reaches another's.

let made = 0;
const commitHash = () => (++made).toString(16).padStart(40, "0");

/** `files` maps each path to its text, or to a Blob for a picture. `save` swaps the files in a new commit. */
export function fakeKnowledge(files: Record<string, string | Blob>) {
  const state = { files, hash: commitHash(), committedAt: 1_793_761_238 };
  const calls = { log: 0, readTree: 0, readFile: 0 };
  const children = (folder: string) => [...new Set(Object.keys(state.files).filter(path => path.startsWith(folder))
    .map(path => path.slice(folder.length).split("/")[0]))].sort().map(name => {
    const tree = Object.keys(state.files).some(path => path.startsWith(`${folder}${name}/`));
    return { name, mode: tree ? "40000" : "100644", hash: tree ? `tree:${folder}${name}/` : `blob:${folder}${name}`, type: tree ? "tree" : "blob" };
  });
  const repo = {
    log: async ({ ref }: { ref: string }) => {
      calls.log++;
      return ref === "main" && state.hash ? [{ hash: state.hash, treeHash: "tree:", committedAt: state.committedAt }] : [];
    },
    readTree: async (hash: string) => {
      calls.readTree++;
      return hash.startsWith("tree:") ? children(hash.slice(5)) : null;
    },
    readFile: async ({ ref, path }: { ref: string; path: string }) => {
      calls.readFile++;
      const found = ref === state.hash && Object.hasOwn(state.files, path) ? state.files[path] : null;
      return typeof found === "string" ? new Blob([found], { type: "text/markdown" }) : found;
    },
  };
  const env = { ARTIFACTS: { get: async () => repo }, WONG_KNOWLEDGE_REPOSITORY: "acme-knowledge", WONG_ENVIRONMENT: "production" };
  const save = (next: Record<string, string | Blob>) => {
    state.files = next;
    state.hash = commitHash();
  };
  return { env, repo, state, calls, save };
}

/** The pages most tests read: nested folders, a public page, a private one, a diagram, unsafe HTML and links. */
export const PAGES = {
  "README.md": "# Company knowledge\n\nStart with [refunds](how-we-work/refunds.md) and [the people](people/).\n",
  "welcome.md": "---\npublic: true\n---\n# Welcome\n\nWelcome to Acme Clay. See [refunds](how-we-work/refunds.md).\n\n![Our shop](shop.png)\n",
  "people/README.md": "# People\n\n- [Sam Lee](sam-lee.md)\n",
  "people/sam-lee.md": "# Sam Lee\n\nRuns shipping and the warehouse.\n",
  "how-we-work/refunds.md": "---\npublic: false\n---\n# Refunds\n\nWe refund within 30 days of delivery.\n\n" +
    "```mermaid\nflowchart TD\n  ask --> refund\n```\n\n<script>alert(1)</script>\n\n[click](javascript:alert(1)) " +
    "<img src=x onerror=alert(1)>\n\n![Chart](chart.png) ![Logo](logo.svg)\n",
  "shop.png": new Blob(["png bytes"], { type: "image/png" }),
  "how-we-work/chart.png": new Blob(["png bytes"], { type: "image/png" }),
  "how-we-work/logo.svg": new Blob(["<svg onload=alert(1)/>"], { type: "image/svg+xml" }),
  ".github/notes.md": "# Hidden\n",
};
