import { afterEach, expect, test, vi } from 'vitest';
import { provider } from './cloudflare-list.mjs';

afterEach(() => { vi.unstubAllGlobals(); });

test('limits the key to fixed provider destinations, refuses redirects and hides provider errors', async () => {
  const fetch = vi.fn(async () => Response.json({ ok: true })); vi.stubGlobal('fetch', fetch);
  expect(await provider('/app', 'secret')).toEqual({ ok: true });
  await provider('/app', 'secret', 'POST', { safe: true });
  expect(fetch.mock.calls[1]).toMatchObject(['https://api.cloudflare.com/client/v4/app', { redirect: 'manual', body: '{"safe":true}' }]);
  for (const path of ['https://other.example.com', '//other.example.com', '/../secret']) {
    await expect(provider(path, 'secret')).rejects.toMatchObject({ code: 'provider_destination_invalid' });
  }
  for (const status of [302, 401, 404, 500]) {
    fetch.mockImplementationOnce(async () => new Response('secret diagnostics', { status }));
    await expect(provider('/app', 'secret')).rejects.toMatchObject({ code: status === 404 ? 'provider_not_found' : 'provider_unavailable' });
  }
  fetch.mockImplementationOnce(async () => new Response(null, { status: 204 }));
  expect(await provider('/installation/token', 'secret', 'DELETE')).toBeNull();
  fetch.mockImplementationOnce(async () => new Response(' '.repeat(1_048_577)));
  await expect(provider('/app', 'secret')).rejects.toMatchObject({ code: 'json_body_too_large' });
});
