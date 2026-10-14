import { expect, it } from 'vitest';
import { servedFrom, setupFile } from './setup-file';
const origin = 'https://business.example.com';
it('writes the address it was fetched from into the setup script, and refuses a script with no line for it', () => {
  expect(servedFrom(origin, "a\nconst SERVED_FROM = '';\nb")).toBe('a\nconst SERVED_FROM = "https://business.example.com";\nb');
  expect(() => servedFrom(origin, 'const SERVED_FROM = "";')).toThrow('The setup script has no SERVED_FROM line');
  // The script the project ships has the line, once.
  expect(servedFrom(origin).split(`const SERVED_FROM = "${origin}";`)).toHaveLength(2);
});
it('answers the file to a GET, never cached, and refuses every other method', async () => {
  const served = setupFile(new Request(`${origin}/_memory/setup.mjs`));
  expect([served.status, served.headers.get('Content-Type'), served.headers.get('Cache-Control')]).toEqual([200, 'text/javascript; charset=utf-8', 'no-store']);
  const text = await served.text();
  expect(text.startsWith('#!/usr/bin/env node')).toBe(true);
  expect(text).toContain(`const SERVED_FROM = "${origin}";`);
  // It holds the app's address and nothing secret.
  expect(text).not.toMatch(/eyJ[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+|github_pat_|ghp_/);
  for (const method of ['POST', 'PUT', 'DELETE', 'HEAD']) {
    const refused = setupFile(new Request(`${origin}/_memory/setup.mjs`, { method }));
    expect([refused.status, refused.headers.get('Allow'), await refused.text()], method).toEqual([405, 'GET', '']);
  }
});
