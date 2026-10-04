// Bound both owner input and provider readback without leaking partial diagnostics.
import { AccessError } from "./core.ts";
import { boundedBytes } from "../api/body.ts";
export async function boundedJson(message: Request | Response, limit: number): Promise<unknown> {
  if (!message.body) throw new AccessError("json_body_required", 400);
  const bytes = await boundedBytes(message.body, limit, () => new AccessError("json_body_too_large", 413));
  try { return JSON.parse(new TextDecoder("utf-8", { fatal: true, ignoreBOM: false }).decode(bytes)); }
  catch { throw new AccessError("json_body_invalid", 400); }
}
