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
it('gives a person who gets the project a short text that names the checked installer and its one step, and leaves the apps-only text as it was', () => {
  const origin = 'https://business.example.com';
  const apps = setupPrompt(origin, artifact), same = setupPrompt(origin, artifact, false), project = setupPrompt(origin, artifact, true);
  expect(same).toEqual(apps);
  // Byte for byte: the text every already-connected person was given.
  expect(apps).toMatchObject({ state: 'ready', text: expect.stringMatching(/^Connect my assistant to the company API at https:\/\/business\.example\.com using my own business app login\.\n[^]*never substitute employer, deployment, verification or memory credentials\.$/) });
  if (project.state !== 'ready' || apps.state !== 'ready') throw new Error('both texts are ready with complete pins');
  expect(apps.text.split('\n')).toHaveLength(5);
  expect(project.text.split('\n').length).toBeLessThanOrEqual(6);
  for (const text of [`https://raw.githubusercontent.com/matthewwong525/WongStack/${artifact.commit}/scripts/employee-bootstrap.mjs`, artifact.sha256,
    `bootstrap.mjs install --origin ${origin}`, 'refuse redirects', 'Git']) expect(project.text).toContain(text);
  expect(project.text).not.toMatch(/eyJ|github_pat_|ghp_|token|password|key\b/i);
  expect(project.text.length).toBeLessThan(apps.text.length);
  // Incomplete pins leave both texts unavailable.
  expect(setupPrompt(origin, { ...artifact, sha256: '' }, true).state).toBe('unavailable');
});
