import { expect, it } from 'vitest';
import { setupMessage } from './prompt';
it('is one short message that names the fixed link, asks for the sign-in link and a report, and holds no key or fingerprint', () => {
  const text = setupMessage('https://business.example.com');
  expect(text.split('\n')).toEqual([
    "Set up my company's project for me in this folder.",
    'Download https://business.example.com/_memory/setup.mjs and run it with node.',
    'Print the sign-in link it shows into the chat and wait while I sign in.',
    'Then tell me what works and what is left.',
  ]);
  expect(text).not.toMatch(/eyJ|github|SHA-256|[a-f0-9]{40}|token|password|key\b|private directory|bootstrap/i);
});
