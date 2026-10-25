// The live line's own Worker. It has no web address; the app reaches the line through its binding, so the app
// holds no Durable Object and keeps its per-change preview links. wiki/stack/live-line.md
export { Line } from "./apps/inbox/line.ts";

export default {
  fetch: () => new Response("Not found", { status: 404 }),
} satisfies ExportedHandler;
