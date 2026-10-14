// Shared bounded stream reader; callers retain their own wire error contracts.
export async function boundedBytes(body: ReadableStream<Uint8Array>, max: number, limitError: () => Error): Promise<Uint8Array> {
  const reader = body.getReader();
  const chunks: Uint8Array[] = [];
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
/** Two byte runs as one. */
export function joined(first: Uint8Array, second: Uint8Array): Uint8Array<ArrayBuffer> {
  const bytes = new Uint8Array(first.length + second.length);
  bytes.set(first);
  bytes.set(second, first.length);
  return bytes;
}
