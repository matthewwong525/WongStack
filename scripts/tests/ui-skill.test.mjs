import assert from 'node:assert/strict';
import { existsSync, readFileSync } from 'node:fs';
import { dirname, join, posix } from 'node:path';
import test from 'node:test';
import { GUIDANCE_PIN, readGuidancePin } from '../../.agents/skills/update-dependencies/scripts/update.mjs';
import { countText, skillDescription } from '../measure-context.mjs';

const REPO = join(import.meta.dirname, '../..');
const SKILL = readFileSync(join(REPO, GUIDANCE_PIN), 'utf8');
const BODY_WORDS = 150;
const DESCRIPTION_WORDS = 27;
// The four sources in reading order: what each numbered step links to, or for the last, the command it names.
const SOURCES = ['wiki/ux-principles.md', 'wiki/design-guide.md', '.agents/rules/code.md#where-things-go', 'modern-web-guidance@'];

const body = text => text.replace(/^---\r?\n[\s\S]*?\r?\n---\r?\n/, '');
const hrefs = text => [...text.matchAll(/\]\(([^)\s]+)\)/g)].map(match => match[1]);
const slug = heading => heading.toLowerCase().replace(/[^\w\s-]/g, '').trim().replace(/\s/g, '-');
/** A link of the skill as a path from the repo's root, its `#heading` kept. */
const fromRoot = href => posix.normalize(posix.join(dirname(GUIDANCE_PIN), href));

/** One line when `text` names the web guidance tool with no one exact version, else null. */
function commandProblem(text) {
  if (readGuidancePin(text)) return null;
  const found = text.match(/\bmodern-web-guidance(?:@[^\s"'`]*)?/g) ?? ['no modern-web-guidance command'];
  return `${GUIDANCE_PIN}: name one exact version, as in \`npx -y modern-web-guidance@1.0.0\`; found: ${[...new Set(found)].join(', ')}`;
}

/** What each numbered step of `text` points at: its first link from the repo's root, else the step's own words. */
function sources(text) {
  return [...body(text).matchAll(/^(\d+)\. (.*)$/gm)].map(([, number, step]) => {
    const [href] = hrefs(step).filter(link => !/^https?:/.test(link));
    return { number: Number(number), target: href ? fromRoot(href) : step };
  });
}

/** One line for each link of `text` whose file, or whose heading in that file, is missing under `root`. */
function deadLinks(text, root = REPO) {
  return hrefs(text).filter(href => !/^https?:/.test(href)).flatMap(href => {
    const [file, anchor] = fromRoot(href).split('#');
    if (!existsSync(join(root, file))) return [`${href}: no file ${file}`];
    const headings = [...readFileSync(join(root, file), 'utf8').matchAll(/^#+ (.+)$/gm)].map(match => slug(match[1]));
    return !anchor || headings.includes(anchor) ? [] : [`${href}: ${file} has no heading #${anchor}`];
  });
}

test('the lookup names one exact web guidance version, never @latest or a bare name', () => {
  assert.equal(commandProblem(SKILL), null);
  assert.match(SKILL, /`npx -y modern-web-guidance@\d+\.\d+\.\d+ search "[^"`]+"`, then `retrieve "[^"`]+"`/);
  const pin = readGuidancePin(SKILL);
  const named = `modern-web-guidance@${pin}`;
  const expected = version => `${GUIDANCE_PIN}: name one exact version, as in \`npx -y modern-web-guidance@1.0.0\`; found: ${version}`;
  assert.equal(commandProblem(SKILL.replaceAll(named, 'modern-web-guidance@latest')), expected('modern-web-guidance@latest'));
  assert.equal(commandProblem(SKILL.replaceAll(named, 'modern-web-guidance')), expected('modern-web-guidance'));
  assert.equal(commandProblem(SKILL.replaceAll(named, 'modern-web-guidance@^1.0.0')), expected('modern-web-guidance@^1.0.0'));
  assert.equal(commandProblem(SKILL.replaceAll(named, 'a lookup tool')), expected('no modern-web-guidance command'));
});

test('the four sources come in order: UX principles, the design guide, the ready-made parts, web guidance', () => {
  const steps = sources(SKILL);
  assert.deepEqual(steps.map(step => step.number), [1, 2, 3, 4], 'the skill lists four numbered sources');
  SOURCES.forEach((source, i) => {
    assert.ok(steps[i].target.includes(source), `source ${i + 1} is ${source}; the skill has: ${steps[i].target}`);
  });
  const [first, second, ...rest] = SKILL.split(/^(?=\d+\. )/m).slice(1);
  const swapped = sources(['', second.replace(/^2/, '1'), first.replace(/^1/, '2'), ...rest].join(''));
  assert.ok(!swapped[0].target.includes(SOURCES[0]), 'the design guide before the UX principles is out of order');
});

test('every link in the skill resolves in the source, heading included', () => {
  assert.deepEqual(deadLinks(SKILL), []);
  assert.ok(hrefs(body(SKILL)).length >= 3, 'the skill links its sources');
  assert.deepEqual(deadLinks('[gone](../../../wiki/no-such-page.md)'), ['../../../wiki/no-such-page.md: no file wiki/no-such-page.md']);
  assert.deepEqual(deadLinks('[gone](../../rules/code.md#no-such-heading)'), [
    '../../rules/code.md#no-such-heading: .agents/rules/code.md has no heading #no-such-heading',
  ]);
});

test('the skill stays small: 150 words of body and 27 of description at most', () => {
  const words = countText(body(SKILL)).words;
  assert.ok(words <= BODY_WORDS, `${GUIDANCE_PIN}: the body has ${words} words; trim it to ${BODY_WORDS}, the design guide carries the detail`);
  const description = countText(skillDescription(SKILL)).words;
  assert.ok(description > 0, `${GUIDANCE_PIN}: the frontmatter has no description`);
  assert.ok(description <= DESCRIPTION_WORDS, `${GUIDANCE_PIN}: the description has ${description} words; trim it to ${DESCRIPTION_WORDS}`);
  assert.match(SKILL, /^---\nname: ui\n/);
});
