// One guard: the README and the getting-started guide say what the landing page says about each way, calling none free.
// Its own step in scripts/payload-checks.mjs: a wiki-only change skips the suite. wiki/maintaining/landing-page.md
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

// What a way to install costs and needs, as the landing page lists it: the one cost both ways share, the
// computers of the way that works on fewer, and the account only the GitHub way asks for.
function installFacts(ways, cost) {
  assert.ok(ways.length === 2 && ways.every(way => way.cost === cost), `${INSTALL} must list two ways to install, both at PAID_COST`);
  const [wide, narrow] = [...ways].sort((a, b) => b.accounts.length - a.accounts.length);
  const extra = wide.accounts.filter(account => !narrow.accounts.includes(account));
  assert.equal(extra.length, 1, `${INSTALL}: one way must need exactly one account the other does not`);
  return { cost, computers: narrow.computers.join(' or '), extraAccount: extra[0] };
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
function costProblems(page, markdown, { cost, computers, extraAccount }) {
  const text = collapse(plain(markdown));
  const together = `The README, the getting-started guide, and the landing page must agree on each way to install: change ${page} and ${INSTALL} in the same change.`;
  const problems = [];
  if (!text.includes(cost)) problems.push(`${page} does not say "${cost}", the cost of every way in ${INSTALL}. ${together}`);
  else if (!sentences(markdown).some(sentence => /\b(both|every)\b/i.test(sentence) && sentence.includes(cost))) {
    problems.push(`${page} has no sentence that says "both" or "every" with "${cost}": every way in ${INSTALL} costs it. ${together}`);
  }
  if (!text.includes(computers)) problems.push(`${page} does not say "${computers}", the computers of the way with one account in ${INSTALL}. ${together}`);
  if (!text.includes(`${extraAccount} account`)) problems.push(`${page} does not say "${extraAccount} account", the account only one way needs in ${INSTALL}. ${together}`);
  const free = sentences(markdown).find(sentence => /\bfree\b/i.test(sentence) && /\bways?\b/i.test(sentence));
  if (free) problems.push(`${page} calls a way to install free: "${free}". Every way in ${INSTALL} costs ${cost}. ${together}`);
  return problems;
}

test("the README and the getting-started guide say the landing page's cost, computers, and extra account, and call no way free", () => {
  assert.match(PAID_COST, /\$\d/, `${INSTALL} must export PAID_COST as a figure`);
  const facts = installFacts(WAYS, PAID_COST);
  assert.ok(facts.computers, `${INSTALL}: the way with one account must list its computers`);
  for (const page of PAGES) assert.deepEqual(costProblems(page, read(page), facts), []);
});

test('a page that drops or changes the cost, the computers, or the extra account, or calls a way free, is refused, naming both files', () => {
  const facts = installFacts([
    { cost: 'about $7 a month', accounts: ['Hub', 'Cloud'], computers: ['Mac', 'Windows', 'Linux'] },
    { cost: 'about $7 a month', accounts: ['Cloud'], computers: ['Mac', 'Linux'] },
  ], 'about $7 a month');
  assert.deepEqual(facts, { cost: 'about $7 a month', computers: 'Mac or Linux', extraAccount: 'Hub' });
  const page = 'wiki/guide.md';
  const agrees = '# Guide\n\nKeep it in a [Hub](https://hub.example/signup) account, or in Cloud alone on Mac or Linux. Both need its paid plan (about $7\na month). The tools are free.\n';

  assert.deepEqual(costProblems(page, agrees, facts), []);
  assert.deepEqual(costProblems(page, 'Both ways cost about $7 a month.\n\n| | With Hub | Cloud alone |\n|---|---|---|\n| Accounts | a Hub account | Cloud |\n| Cost | about $7 a month | about $7 a month |\n| Computers | any | Mac or Linux |\n', facts), []);
  for (const [name, text, missing] of [
    ['a changed figure', agrees.replace('$7', '$9'), 'about $7 a month'],
    ['no "both" with the figure', agrees.replace('Both need', 'It needs'), 'about $7 a month'],
    ['other computers', agrees.replace('Mac or Linux', 'any computer'), 'Mac or Linux'],
    ['no extra account named', agrees.replace('a [Hub](https://hub.example/signup) account', 'one more place'), 'Hub account'],
    ['the account only in a link address', agrees.replace('[Hub](https://hub.example/signup)', '[one more](https://Hub.example/signup)'), 'Hub account'],
    ['a way called free', agrees.replace('The tools are free.', 'The Hub way is free.'), 'The Hub way is free.'],
    ['a free-way table', `${agrees}\n| | Free way | Cloud alone |\n|---|---|---|\n`, '| | Free way | Cloud alone |'],
  ]) {
    const problems = costProblems(page, text, facts);
    assert.equal(problems.length, 1, `${name} must be refused once: ${JSON.stringify(problems)}`);
    assert.ok(problems[0].includes(`"${missing}"`), `${name}: ${problems[0]}`);
    assert.match(problems[0], /wiki\/guide\.md/, name);
    assert.match(problems[0], /site\/src\/install\.ts/, name);
  }
  assert.equal(costProblems(page, '# Guide\n\nAsk for a copy.\n', facts).length, 3, 'a page with none of it is refused three times');
});

test('a list of ways that is not two at the same cost, one needing one more account, is refused', () => {
  const hub = { cost: 'about $7 a month', accounts: ['Hub', 'Cloud'], computers: ['Mac'] };
  const alone = { cost: 'about $7 a month', accounts: ['Cloud'], computers: ['Mac'] };
  for (const ways of [[hub], [alone], [hub, alone, alone], [{ ...hub, cost: 'free' }, alone], [{ ...hub, accounts: ['Cloud'] }, alone]]) {
    assert.throws(() => installFacts(ways, alone.cost), /site\/src\/install\.ts/);
  }
});
