// One guard: the README and the getting-started guide say what the landing page
// says about each way to install: its cost, its computers, and which way is
// free. Meta-only, like the landing page.
//
// It is its own file with its own step in scripts/payload-checks.mjs, because a
// change under wiki/ alone skips the script suite, and that is how the guide
// came to disagree. It reads three files and installs nothing.
// wiki/maintaining/landing-page.md
import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
// The page's own figures, read from the file the page reads. Node strips the
// types, so this is the module itself, never a copy.
import { PAID_COST, WAYS } from '../../site/src/install.ts';

const repo = resolve(dirname(fileURLToPath(import.meta.url)), '../..');
const read = path => readFileSync(join(repo, path), 'utf8');

const INSTALL = 'site/src/install.ts';
const PAGES = ['README.md', 'wiki/stack/getting-started.md'];

// What a way to install costs and needs, as the landing page lists it: the paid
// way's cost and computers, and the account only the free way asks for.
function installFacts(ways, cost) {
  const paid = ways.find(way => way.cost === cost);
  const free = ways.find(way => way.cost === 'free');
  assert.ok(paid && free && ways.length === 2, `${INSTALL} must list two ways to install, one free and one at PAID_COST`);
  const freeOnly = free.accounts.filter(account => !paid.accounts.includes(account));
  assert.equal(freeOnly.length, 1, `${INSTALL}: the free way must need exactly one account the paid way does not`);
  return { cost, computers: paid.computers.join(' or '), freeAccount: freeOnly[0] };
}

// A page's words as a reader meets them: each link is its text.
const plain = markdown => markdown.replace(/\[([^\]]*)\]\([^)]*\)/g, '$1');
const collapse = text => text.replace(/\s+/g, ' ').trim();

// A page's sentences. A paragraph, a table row, a list item, and a heading each
// end one, as a full stop does.
const sentences = markdown => plain(markdown)
  .split(/\n\s*\n|\n(?=\s*(?:\||[-*] |\d+\. |#))|(?<=[.!?])\s+/)
  .map(collapse)
  .filter(Boolean);

// Why `page` no longer says what the landing page says, one line per missing
// fact, each naming both files. Empty when it agrees.
function costProblems(page, markdown, { cost, computers, freeAccount }) {
  const text = collapse(plain(markdown));
  const together = `The README, the getting-started guide, and the landing page must agree on each way to install: change ${page} and ${INSTALL} in the same change.`;
  const problems = [];
  if (!text.includes(cost)) problems.push(`${page} does not say "${cost}", the paid way's cost in ${INSTALL}. ${together}`);
  if (!text.includes(computers)) problems.push(`${page} does not say "${computers}", the paid way's computers in ${INSTALL}. ${together}`);
  if (!sentences(markdown).some(sentence => /\bfree\b/i.test(sentence) && sentence.includes(freeAccount))) {
    problems.push(`${page} has no sentence that says "free" and "${freeAccount}", the free way's account in ${INSTALL}. ${together}`);
  }
  return problems;
}

test("the README and the getting-started guide say the landing page's cost, computers, and free way", () => {
  assert.match(PAID_COST, /\$\d/, `${INSTALL} must export PAID_COST as a figure`);
  const facts = installFacts(WAYS, PAID_COST);
  assert.ok(facts.computers, `${INSTALL}: the paid way must list its computers`);
  for (const page of PAGES) assert.deepEqual(costProblems(page, read(page), facts), []);
});

test('a page that drops or changes the cost, the computers, or the free way is refused, naming both files', () => {
  const facts = installFacts([
    { cost: 'free', accounts: ['Hub', 'Cloud'], computers: ['Mac', 'Windows', 'Linux'] },
    { cost: 'about $7 a month', accounts: ['Cloud'], computers: ['Mac', 'Linux'] },
  ], 'about $7 a month');
  assert.deepEqual(facts, { cost: 'about $7 a month', computers: 'Mac or Linux', freeAccount: 'Hub' });
  const page = 'wiki/guide.md';
  const agrees = '# Guide\n\nKeep it in Cloud, on its paid plan (about $7\na month, Mac or Linux), or in a free [Hub](https://hub.example/signup) account.\n';

  assert.deepEqual(costProblems(page, agrees, facts), []);
  assert.deepEqual(costProblems(page, '| | Free way | Cloud alone |\n|---|---|---|\n| Accounts | a free Hub account | Cloud |\n| Cost | free | about $7 a month |\n| Computers | any | Mac or Linux |\n', facts), []);
  for (const [name, text, missing] of [
    ['a changed figure', agrees.replace('$7', '$9'), 'about $7 a month'],
    ['no figure', agrees.replace(' (about $7\na month, Mac or Linux)', ' on Mac or Linux'), 'about $7 a month'],
    ['other computers', agrees.replace('Mac or Linux', 'any computer'), 'Mac or Linux'],
    ['a free way with no account named', agrees.replace('a free [Hub](https://hub.example/signup) account', 'for free'), 'Hub'],
    ['free and the account in different sentences', `${agrees.replace('a free [Hub]', 'a [Hub]')}\nThe tools are free.\n`, 'Hub'],
    ['the account only in a link address', agrees.replace('[Hub](https://hub.example/signup)', '[one more](https://Hub.example/signup)'), 'Hub'],
  ]) {
    const problems = costProblems(page, text, facts);
    assert.equal(problems.length, 1, `${name} must be refused once: ${JSON.stringify(problems)}`);
    assert.ok(problems[0].includes(`"${missing}"`), `${name}: ${problems[0]}`);
    assert.match(problems[0], /wiki\/guide\.md/, name);
    assert.match(problems[0], /site\/src\/install\.ts/, name);
  }
  assert.equal(costProblems(page, '# Guide\n\nAsk for a copy.\n', facts).length, 3, 'a page with none of it is refused three times');
});

test('a list of ways that is not one free and one paid is refused', () => {
  const free = { cost: 'free', accounts: ['Hub', 'Cloud'], computers: ['Mac'] };
  const paid = { cost: 'about $7 a month', accounts: ['Cloud'], computers: ['Mac'] };
  for (const ways of [[free], [paid], [free, paid, paid], [{ ...free, accounts: ['Cloud'] }, paid]]) {
    assert.throws(() => installFacts(ways, paid.cost), /site\/src\/install\.ts/);
  }
});
