import type { AppCall, AppEnv } from "../index.ts";

/** GET greeting?name=Ada → { message: "Hello, Ada!" } */
export function greeting(_request: Request, _env: AppEnv, { url }: AppCall): Response {
  const name = (url.searchParams.get("name") ?? "").trim().slice(0, 40) || "world";
  return Response.json({ message: `Hello, ${name}!` });
}
