import { expect, it } from 'vitest';
import { businessName, setupMessage } from './prompt';
it('is one short message that names the business and the fixed link, says what the file does, and holds no key or fingerprint', () => {
  const text = setupMessage('https://business.example.com', 'recipe-box');
  expect(text.split('\n')).toEqual([
    "Set up recipe-box's project for me in this folder.",
    'Download https://business.example.com/_memory/setup.mjs and run it with node.',
    'This file signs me in to recipe-box and downloads our project; read it first if you like.',
    'Print the sign-in link it shows into the chat and wait while I sign in.',
    'Then tell me what works and what is left.',
  ]);
  expect(text).not.toMatch(/eyJ|github|SHA-256|[a-f0-9]{40}|token|password|key\b|private directory|bootstrap/i);
});
it('names the business by its project, else by the app\'s own address', () => {
  const origin = 'https://business.example.com';
  expect([businessName({ WONG_CODE_REPOSITORY: 'acme/recipe-box' }, origin), businessName({ WONG_CODE_REPOSITORY: 'recipe-box' }, origin),
    businessName({ WONG_CODE_REPOSITORY: ' ' }, origin), businessName({}, origin)]).toEqual(['recipe-box', 'recipe-box', 'business.example.com', 'business.example.com']);
});
