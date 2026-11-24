// What every Access answer shares: the refusal type, the JSON reply, the time stamp, and a bounded JSON body.

/** A refusal with a short code the page and the helper read; `status` is the HTTP status it answers with. */
export class AccessError extends Error {
  constructor(code, status = 503) { super(code); this.code = code; this.status = status; }
}

export const reply = (body, status = 200) => Response.json(body, { status, headers: { 'Cache-Control': 'no-store' } });
export const now = () => new Date().toISOString();

/** Up to `max` bytes of a stream; more throws `limitError()`. */
export async function boundedBytes(body, max, limitError) {
  const reader = body.getReader();
  const chunks = [];
  let size = 0;
  try {
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      size += value.byteLength;
      if (size > max) throw limitError();
      chunks.push(value);
    }
  } finally { await reader.cancel(); }
  const bytes = new Uint8Array(size);
  let offset = 0;
  for (const chunk of chunks) { bytes.set(chunk, offset); offset += chunk.byteLength; }
  return bytes;
}

/** A request's or a provider's JSON, bounded, with no partial diagnostics on a failure. */
export async function boundedJson(message, limit) {
  if (!message.body) throw new AccessError('json_body_required', 400);
  const bytes = await boundedBytes(message.body, limit, () => new AccessError('json_body_too_large', 413));
  try { return JSON.parse(new TextDecoder('utf-8', { fatal: true, ignoreBOM: false }).decode(bytes)); }
  catch { throw new AccessError('json_body_invalid', 400); }
}

/** An answer from outside, such as a sign-in provider's, in a shape this module can not read. */
export class Unreadable extends Error {
  constructor(what = 'unreadable') { super(what); this.name = 'Unreadable'; }
}
