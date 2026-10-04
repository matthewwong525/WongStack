#!/usr/bin/env node
// Measure how well /verify's walkthrough instructions catch a broken promise. Each run starts the
// practice site (scripts/fixtures/verify-eval/site.mjs: twelve promises, five quietly broken, three
// with a part no page can show), hands a headless agent the reference, the promises, and the site,
// and scores its verdicts against key.json.
// The agent works in a temp folder outside the repo that holds the promises only, never the answers.
// Meta-only: no target receives it. Run it by hand: every run is a paid agent session.
import { execFileSync, spawn } from 'node:child_process';
import { cpSync, existsSync, mkdirSync, mkdtempSync, readFileSync, readdirSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { startSite } from './fixtures/verify-eval/site.mjs';
import { practiceCaptures, PRACTICE_SHA } from './fixtures/verify-eval/mixed/captures.mjs';
import { scoreMixed } from './verify-eval-score.mjs';
import { parseCli, usageError } from './lib-cli.mjs';

const REPO = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const FIXTURE = join(REPO, 'scripts/fixtures/verify-eval');
const RUNNER = join(REPO, '.agents/skills/verify/scripts/verify-staging.sh');
const LIVE_REFERENCE = join(REPO, '.agents/skills/verify/references/walkthrough.md');
const CHANGE = 'openspec/changes/practice-notes';
// The prompt arrives on stdin. Root may not skip permission checks, so the tools are named.
const AGENT_CMD = 'claude -p --output-format json --allowedTools "Bash,Read,Write,Edit,Glob,Grep"';
const VERDICTS = ['pass', 'fail', 'ask', 'partial'];
const FRAMINGS = ['none', 'builder'];
const NOTES = 'BUILD-NOTES.md';
const EXERCISES = ['browser', 'mixed'];

const USAGE = `usage: eval-verify.mjs [--exercise browser|mixed] [--reference <path>] [--runs <n>] [--label <name>] [--framing builder|none] [--out <dir>] [--agent-cmd "<cmd>"]
  Runs a headless agent against the practice site and counts the planted mistakes it catches, and
  the promises with a part no page can show that it names as partly shown.
  --reference  the walkthrough instructions to measure (default: the live walkthrough.md)
  --exercise   browser retains the original twelve promises; mixed adds practice captures, preferences,
               seeded orders, a receipt on a shared key and a timed job with a manual trigger
  --runs       how many runs (default: 3; 1 is a smoke test)
  --label      a name for this version in the table and results.json (default: live)
  --framing    builder tells the agent it built the site and hands it its build notes, which say all twelve
               promises work; none hands it the promises only (default: none)
  --out        where verdicts, agent output, and results.json go (default: a temp folder named for the label)
  --agent-cmd  the agent command; it reads the prompt on stdin and gets RUN_DIR and URL in its environment
               (default: ${AGENT_CMD})`;

// An agent that never built the site already grades with fresh eyes. This opener, with the notes
// beside the promises, stands in for an agent grading its own build.
const BUILDER = `You built this change earlier in this session; your notes are in ${NOTES}. Now walk it.

`;

const prompt = ({ reference, url, runDir, framing }) => `${framing === 'builder' ? BUILDER : ''}You are checking a small notes site against the promises a change made about it. This is a practice run: post nothing, save nothing, and ask nobody.

1. Read the walkthrough reference at ${reference} and follow its sections a to d. Skip e and f.
2. Scout only the scenarios under ${CHANGE}/specs/ in the current folder. There is no pull request and no preflight to run: the site is already live at ${url} (URL), your run folder is ${runDir} (RUN_DIR), and agent-browser is installed (BROWSER=local).
3. Write the journeys in ${runDir}/journeys/ and run them with:
   bash ${RUNNER} run "${runDir}" "${url}"
   You may rewrite a journey and run again.
4. Grade each scenario by section d. Where it says to stop and ask the person, give the verdict "ask" instead.
5. Write ${runDir}/verdicts.json: a JSON array with one entry per scenario, {"scenario": "<the name after '#### Scenario:', exactly>", "verdict": "pass" | "fail" | "ask" | "partial", "reason": "<one line>"}.

Never run an installer, never delete a cache, and write nothing outside ${runDir}.
`;

// Both references receive the same neutral access information and output format. The reference
// decides which extra checks to select, how to handle unavailable evidence, and what to grade.
const mixedPrompt = options => prompt(options)
  .replace('follow its sections a to d. Skip e and f.', 'follow its sections a to d, then write section f\'s final report. Skip repairs and posting.')
  .replace('Scout only the scenarios under', 'Scout the change scenarios under')
  .replace('in the current folder.', 'in the current folder; other canonical capabilities are in openspec/specs/. Access instructions and source relationships are in wiki/practice-captures.md.')
  .replace('"partial",', '"partial" | "unverified",')
  + `\nThe reviewed practice source is ${PRACTICE_SHA}. Write the final report to ${options.runDir}/comment.md, including the overall verdict on its own line as Overall: <verdict>, and a table with columns Scenario | Verdict | Evidence and limits. Use scenario names exactly, and pass, fail, partial or unverified in the verdict column. Keep your selected journey metadata or ledger in the run folder. These output formats supply no expected result. All receipts and site actions here are practice evidence.\n`;

const readJson = path => {
  try {
    return JSON.parse(readFileSync(path, 'utf8'));
  } catch {
    return null;
  }
};

const normalize = name => String(name ?? '').trim().toLowerCase().replace(/\s+/g, ' ');

const PARTIAL_OUTCOMES = { partial: 'named', pass: 'overclaimed' };

function outcome(truth, verdict) {
  if (truth === 'partial') return PARTIAL_OUTCOMES[verdict] ?? 'other';
  if (verdict === 'ask') return 'asked';
  if (truth === 'broken') return verdict === 'fail' ? 'caught' : 'missed';
  if (verdict === 'fail' || verdict === 'partial') return 'falseAlarm';
  return verdict ? 'passed' : 'ungraded';
}

// A planted mistake is caught only by a "fail": a "pass", a "partial", or no verdict misses it, and
// an "ask" is counted apart. A working promise graded "fail" or "partial" is a false alarm. A promise
// with a part no page can show is named by a "partial" and overclaimed by a "pass"; anything else
// is counted as other.
function score(key, verdicts) {
  const given = new Map();
  for (const entry of Array.isArray(verdicts) ? verdicts : []) {
    if (VERDICTS.includes(entry?.verdict)) given.set(normalize(entry.scenario), entry.verdict);
  }
  const counts = { caught: 0, missed: 0, falseAlarm: 0, asked: 0, named: 0, overclaimed: 0, other: 0, passed: 0, ungraded: 0 };
  const scenarios = {};
  for (const [name, truth] of Object.entries(key)) {
    const verdict = given.get(normalize(name)) ?? null;
    const result = outcome(truth, verdict);
    counts[result] += 1;
    scenarios[name] = { key: truth, verdict, outcome: result };
  }
  const { caught, missed, falseAlarm: falseAlarms, asked, named, overclaimed, other } = counts;
  return { caught, missed, falseAlarms, asked, named, overclaimed, other, scenarios };
}

function runAgent(cmd, { cwd, env, input }) {
  return new Promise(done => {
    const child = spawn(cmd, { cwd, env, shell: true, stdio: ['pipe', 'pipe', 'inherit'] });
    let stdout = '';
    child.stdout.on('data', chunk => { stdout += chunk; });
    child.on('close', () => done(stdout));
    child.stdin.on('error', () => {}); // an agent that exits without reading its prompt closes the pipe
    child.stdin.end(input);
  });
}

// The cost and model the agent CLI reports, when its output is the JSON `claude -p` prints.
function reported(stdout) {
  let output = null;
  try { output = JSON.parse(stdout); } catch { /* not JSON: nothing reported */ }
  const cost = typeof output?.total_cost_usd === 'number' ? output.total_cost_usd : null;
  const model = Object.keys(output?.modelUsage ?? {}).join(', ') || null;
  return { costUsd: cost, model };
}

function setupMixed(work) {
  const mixed = join(FIXTURE, 'mixed');
  const destinations = {
    'scenarios.md': `${CHANGE}/specs/practice-captures/spec.md`,
    'exports-spec.md': 'openspec/specs/exports/spec.md',
    'health-spec.md': 'openspec/specs/health/spec.md',
    'guide.md': 'wiki/practice-captures.md',
    'exports.mjs': 'app/exports.mjs',
  };
  for (const [source, target] of Object.entries(destinations)) {
    mkdirSync(dirname(join(work, target)), { recursive: true });
    cpSync(join(mixed, source), join(work, target));
  }
  for (const area of ['notes', 'exports']) writeFileSync(join(work, 'wiki', `${area}.md`), `# ${area}\nMapped lookup document.\n`);
  writeFileSync(join(work, 'wiki/notes-api.md'), '# Notes API contract\nGET /api/notes returns {count, notes: [{id, title, body}]}. /exports reads this endpoint and renders each title.\n');
}

function selectedChecks(runDir) {
  return readdirSync(runDir, { recursive: true }).filter(path => path.endsWith('.meta.json') || /ledger.*\.json$/.test(path)).flatMap(path => {
    const data = readJson(join(runDir, path));
    const records = Array.isArray(data) ? data : Array.isArray(data?.scenarios) ? data.scenarios : [data];
    return records.map(entry => entry?.scenario).filter(value => typeof value === 'string');
  });
}

async function runOnce({ run, reference, framing, agentCmd, out, key, exercise, mixedKey }) {
  const captures = exercise === 'mixed' ? practiceCaptures() : null;
  const site = await startSite({ captures });
  const work = mkdtempSync(join(tmpdir(), 'wong-verify-eval-work-'));
  const runDir = mkdtempSync(join(tmpdir(), 'wong-verify-eval-run-'));
  const kept = join(out, `run-${run}`);
  mkdirSync(kept, { recursive: true });
  try {
    execFileSync('git', ['init', '-q'], { cwd: work });
    cpSync(join(FIXTURE, 'change'), join(work, CHANGE), { recursive: true });
    if (exercise === 'mixed') setupMixed(work);
    if (framing === 'builder') cpSync(join(FIXTURE, 'build-notes.md'), join(work, NOTES));
    // The site needs no Access headers, and the runner would send any it finds.
    const env = { ...process.env, RUN_DIR: runDir, URL: site.url };
    delete env.CF_ACCESS_CLIENT_ID;
    delete env.CF_ACCESS_CLIENT_SECRET;
    const started = Date.now();
    const options = { reference, url: site.url, runDir, framing };
    const stdout = await runAgent(agentCmd, { cwd: work, env, input: exercise === 'mixed' ? mixedPrompt(options) : prompt(options) });
    const minutes = (Date.now() - started) / 60000;
    writeFileSync(join(kept, 'agent-output.json'), stdout);
    const verdicts = readJson(join(runDir, 'verdicts.json'));
    if (verdicts) writeFileSync(join(kept, 'verdicts.json'), `${JSON.stringify(verdicts, null, 2)}\n`);
    let mixed = null;
    if (exercise === 'mixed') {
      const comment = existsSync(join(runDir, 'comment.md')) ? readFileSync(join(runDir, 'comment.md'), 'utf8') : '';
      const selected = selectedChecks(runDir);
      mixed = scoreMixed(mixedKey, { verdicts, selected, observations: site.observations, comment });
      writeFileSync(join(kept, 'comment.md'), comment);
      writeFileSync(join(kept, 'observations.json'), `${JSON.stringify({ captures, selected, requests: site.observations }, null, 2)}\n`);
      cpSync(runDir, join(kept, 'run-folder'), { recursive: true });
    }
    return { run, ...score(key, verdicts), ...(mixed ? { mixed } : {}), minutes, ...reported(stdout), error: verdicts ? null : 'the agent wrote no readable verdicts.json' };
  } finally {
    await site.close();
    rmSync(work, { recursive: true, force: true });
    rmSync(runDir, { recursive: true, force: true });
  }
}

const sum = (runs, field) => runs.reduce((total, run) => total + (run[field] ?? 0), 0);
const dollars = cost => (cost === null ? 'n/a' : `$${cost.toFixed(2)}`);

function table(runs, total, { planted, working, partial }) {
  const line = (name, row, runCount) =>
    `| ${name} | ${row.caught}/${planted * runCount} | ${row.missed} | ${row.falseAlarms}/${working * runCount} | ${row.asked} | ${row.named}/${partial * runCount} | ${row.overclaimed} | ${row.other} | ${row.minutes.toFixed(1)} | ${dollars(row.costUsd)} |`;
  return [
    '| run | caught | missed | false alarms | asked | named | overclaimed | other | minutes | cost |',
    '|---|---|---|---|---|---|---|---|---|---|',
    ...runs.map(run => line(run.run, run, 1)),
    line('total', total, runs.length),
  ].join('\n');
}

const { values } = parseCli({
  usage: USAGE,
  options: { exercise: { type: 'string' }, reference: { type: 'string' }, runs: { type: 'string' }, label: { type: 'string' }, framing: { type: 'string' }, out: { type: 'string' }, 'agent-cmd': { type: 'string' } },
});
const exercise = values.exercise ?? 'browser';
if (!EXERCISES.includes(exercise)) usageError(USAGE, '--exercise takes browser or mixed');
const runCount = Number(values.runs ?? 3);
if (!Number.isInteger(runCount) || runCount < 1) usageError(USAGE, '--runs takes a whole number, 1 or more');
const label = values.label ?? 'live';
if (!/^[\w.-]+$/.test(label)) usageError(USAGE, '--label takes letters, digits, dots, dashes, and underscores');
const framing = values.framing ?? 'none';
if (!FRAMINGS.includes(framing)) usageError(USAGE, '--framing takes builder or none');
const reference = resolve(values.reference ?? LIVE_REFERENCE);
if (!existsSync(reference)) usageError(USAGE, `no reference at ${reference}`);
const out = resolve(values.out ?? join(tmpdir(), 'wong-verify-eval', label));
const agentCmd = values['agent-cmd'] ?? AGENT_CMD;

const key = readJson(join(FIXTURE, 'key.json'));
const mixedKey = exercise === 'mixed' ? readJson(join(FIXTURE, 'mixed/key.json')) : null;
const keyed = truth => Object.values(key).filter(value => value === truth).length;
const size = { planted: keyed('broken'), working: keyed('works'), partial: keyed('partial') };

const runs = [];
for (let run = 1; run <= runCount; run += 1) runs.push(await runOnce({ run, reference, framing, agentCmd, out, key, exercise, mixedKey }));
const costs = runs.map(run => run.costUsd).filter(cost => cost !== null);
const total = {
  ...Object.fromEntries(['caught', 'missed', 'falseAlarms', 'asked', 'named', 'overclaimed', 'other'].map(field => [field, sum(runs, field)])),
  minutes: sum(runs, 'minutes'), costUsd: costs.length ? sum(runs, 'costUsd') : null,
};
const date = new Date().toISOString().slice(0, 10);
const model = [...new Set(runs.map(run => run.model).filter(Boolean))].join(', ') || 'not reported';
writeFileSync(join(out, 'results.json'), `${JSON.stringify({ label, reference, framing, exercise, date, model, agentCmd, ...size, runs, total }, null, 2)}\n`);

console.log(`${label} · ${date} · model: ${model} · framing: ${framing}\nreference: ${reference}\n`);
console.log(table(runs, total, size));
const MIXED_FIELDS = ['caught', 'missed', 'correct', 'namedGaps', 'unnamedGaps', 'falsePasses', 'falseAlarms', 'unsafeSends'];
if (exercise === 'mixed') {
  for (const run of runs) console.log(`mixed run ${run.run}: ${MIXED_FIELDS.map(field => `${field} ${run.mixed[field]}`).join(', ')}`);
}
console.log(`\nresults: ${join(out, 'results.json')}`);
const failed = runs.filter(run => run.error);
for (const run of failed) console.error(`run ${run.run}: ${run.error}`);
if (failed.length) process.exit(1);
