import { expect, test } from 'vitest';
import { AccessError, boundedJson, reply } from './errors.mjs';

test('bounds JSON streams and cancels malformed, empty and oversized reads', async () => {
  expect(await boundedJson(Response.json({ ok: true }), 100)).toEqual({ ok: true });
  const stream = new ReadableStream({ start(controller) {
    controller.enqueue(new TextEncoder().encode('{"a":')); controller.enqueue(new TextEncoder().encode('1}')); controller.close();
  } });
  expect(await boundedJson(new Response(stream), 100)).toEqual({ a: 1 });
  await expect(boundedJson(new Response(null), 100)).rejects.toMatchObject({ code: 'json_body_required', status: 400 });
  await expect(boundedJson(new Response('x'), 100)).rejects.toMatchObject({ code: 'json_body_invalid' });
  await expect(boundedJson(new Response(new Uint8Array([255])), 100)).rejects.toMatchObject({ code: 'json_body_invalid' });
  await expect(boundedJson(new Response('12345'), 2)).rejects.toMatchObject({ code: 'json_body_too_large', status: 413 });
});

test('answers with no caching, and a refusal is unavailable unless it says otherwise', () => {
  expect(reply({ code: 'safe' }).headers.get('Cache-Control')).toBe('no-store');
  expect(reply({ code: 'safe' }, 409).status).toBe(409);
  expect(new AccessError('unavailable').status).toBe(503);
});
