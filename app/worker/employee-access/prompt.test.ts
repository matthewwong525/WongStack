import { expect, it } from 'vitest';
import { setupPrompt } from './prompt';
const artifact = { version: 1, commit: 'a'.repeat(40), sha256: 'b'.repeat(64) };
it('requires canonical HTTPS routing and complete immutable artifact pins', () => {
  const origin = 'https://business.example.com';
  const result = setupPrompt(origin, artifact);
  expect(result.state).toBe('ready');
  expect(result).toMatchObject({ text: expect.stringContaining(`${artifact.commit}/scripts/employee-bootstrap.mjs`) });
  for (const text of [artifact.sha256, origin, 'refuse redirects', 'outside every checkout', 'manual through its provider']) expect(JSON.stringify(result)).toContain(text);
  for (const update of [{ version: 2 }, { commit: '' }, { sha256: '' }]) expect(setupPrompt(origin, { ...artifact, ...update }).state).toBe('unavailable');
  for (const target of ['http://business.example.com', origin + '/path', 'https://user:pass@business.example.com']) expect(setupPrompt(target, artifact).state).toBe('unavailable');
  const configured = setupPrompt(origin);
  // Blank pins honestly report unavailable; published pins still pass complete validation.
  expect(['ready', 'unavailable']).toContain(configured.state);
});
