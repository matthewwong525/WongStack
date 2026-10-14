// The setup file served at SETUP_PATH: the project's setup script with its fetch address written in. It holds no key.
// `?raw` is a build-time import, so it stays in this module, which only the route in ../index.ts reaches.
import script from "../../../scripts/employee-bootstrap.mjs?raw";

const MARKER = "const SERVED_FROM = '';";
export function servedFrom(origin: string, source = script): string {
  if (!source.includes(MARKER)) throw new Error("The setup script has no SERVED_FROM line");
  return source.replace(MARKER, () => `const SERVED_FROM = ${JSON.stringify(origin)};`);
}
export function setupFile(request: Request): Response {
  if (request.method !== "GET") return new Response(null, { status: 405, headers: { Allow: "GET", "Cache-Control": "no-store" } });
  return new Response(servedFrom(new URL(request.url).origin), { headers: { "Content-Type": "text/javascript; charset=utf-8", "Cache-Control": "no-store" } });
}
