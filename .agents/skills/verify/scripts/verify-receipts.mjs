#!/usr/bin/env node
// Read CI observations. Never execute downloaded code or decide product correctness.
import { execFileSync } from 'node:child_process';
import { createHash } from 'node:crypto';
import { lstatSync, mkdirSync, mkdtempSync, readFileSync, readdirSync, realpathSync, renameSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { basename, dirname, join, resolve } from 'node:path';
import { isMain, parseCli, usageError } from '../../memory/scripts/lib/cli.mjs';

const USAGE = 'usage: verify-receipts.mjs {check|collect|compare} --recipe <path> [--root <repo>] [--sha <head> --run-dir <owned-folder>] [--baseline-sha <selected-revision>]';
const SHA = /^[a-f0-9]{40}$/;
const DIGEST = /^[a-f0-9]{64}$/;
const NAME = /^[a-z0-9][a-z0-9-]*$/;
class CaptureError extends Error {}
const fail = message => { throw new CaptureError(message); };
const object = value => value !== null && typeof value === 'object' && !Array.isArray(value);
const text = value => typeof value === 'string' && value.length > 0;
const numeric = value => /^[1-9][0-9]*$/.test(String(value));
const digest = bytes => createHash('sha256').update(bytes).digest('hex');
const scenarioKey = value => JSON.stringify([value.capability, value.requirement, value.scenario]);

function relativePath(path) {
  if (!text(path) || path.includes('\\') || path.includes('\0') || path.startsWith('/') || /^[a-z]:/i.test(path)
    || path.split('/').some(part => !part || part === '.' || part === '..')) fail('Invalid relative evidence or reference path');
  return path;
}

// Check every component: realpath alone would accept a symlink that stays inside the root.
function ownedPath(root, path, directory = false) {
  let file = realpathSync(root);
  for (const part of relativePath(path).split('/')) {
    file = join(file, part);
    if (lstatSync(file).isSymbolicLink()) fail('Symlinks are not usable evidence or references');
  }
  const stat = lstatSync(file);
  if (!(directory ? stat.isDirectory() : stat.isFile())) fail('Reference is not the expected file type');
  return file;
}

function jsonFile(file) {
  if (lstatSync(file).size > 1024 * 1024) fail('Manifest or recipe exceeds the capture limit');
  try { return JSON.parse(readFileSync(file, 'utf8')); }
  catch { fail('Capture or recipe JSON is malformed'); }
}

function scenarioReference(value) {
  if (!object(value) || !text(value.capability) || !NAME.test(value.capability) || !text(value.requirement) || !text(value.scenario)
    || Object.keys(value).some(key => !['capability', 'requirement', 'scenario'].includes(key))) fail('Malformed scenario reference');
}

export function checkRecipe({ root, recipePath }) {
  root = realpathSync(root);
  const recipe = jsonFile(ownedPath(root, recipePath));
  if (!object(recipe) || recipe.format !== 'verify-recipe-1' || !text(recipe.id) || !NAME.test(recipe.id)
    || !Array.isArray(recipe.sourcePaths) || !recipe.sourcePaths.length || !Array.isArray(recipe.scenarios)
    || !recipe.scenarios.length || !object(recipe.capture) || !text(recipe.capture.artifact)
    || Object.keys(recipe).some(key => !['format', 'id', 'sourcePaths', 'instructions', 'scenarios', 'capture'].includes(key))
    || Object.keys(recipe.capture).some(key => !['workflow', 'artifact'].includes(key))) fail('Malformed verification recipe');
  if (!/^\.github\/workflows\/[^/]+\.ya?ml$/.test(recipe.capture.workflow)
    || !/^[a-zA-Z0-9][a-zA-Z0-9_.-]*$/.test(recipe.capture.artifact)) fail('Malformed capture route');
  for (const path of [...recipe.sourcePaths, recipe.instructions, recipe.capture.workflow]) ownedPath(root, path);
  const seen = new Set();
  for (const scenario of recipe.scenarios) {
    scenarioReference(scenario);
    const key = scenarioKey(scenario);
    if (seen.has(key)) fail('Duplicate recipe scenario');
    seen.add(key);
    const spec = readFileSync(ownedPath(root, `openspec/specs/${scenario.capability}/spec.md`), 'utf8');
    let requirement;
    let found = false;
    for (const line of spec.split('\n')) {
      if (line.startsWith('### Requirement: ')) requirement = line.slice('### Requirement: '.length).trim();
      if (requirement === scenario.requirement && line === `#### Scenario: ${scenario.scenario}`) found = true;
    }
    if (!found) fail('Scenario reference has drifted');
  }
  return recipe;
}

function fixtureState(state) {
  if (!object(state) || typeof state.envPresent !== 'boolean' || typeof state.installationPresent !== 'boolean'
    || !Array.isArray(state.files)) fail('Malformed fixture observation');
  const seen = new Set();
  for (const file of state.files) {
    if (!object(file) || !DIGEST.test(file.sha256)) fail('Malformed fixture file observation');
    relativePath(file.path);
    if (seen.has(file.path)) fail('Duplicate fixture file observation');
    seen.add(file.path);
  }
}

function inspectTree(folder) {
  let total = 0;
  function visit(path) {
    for (const name of readdirSync(path)) {
      const file = join(path, name);
      const stat = lstatSync(file);
      if (stat.isSymbolicLink()) fail('Symlinks are not usable evidence or references');
      if (stat.isDirectory()) visit(file);
      else if (stat.isFile()) total += stat.size;
      else fail('Artifact contains a special file');
      if (total > 16 * 1024 * 1024) fail('Artifact exceeds the capture limit');
    }
  }
  if (lstatSync(folder).isSymbolicLink()) fail('Symlinks are not usable evidence or references');
  visit(folder);
}

function runIdentity(run, { repository, workflow, headSha }) {
  if (!object(run) || run.repository?.full_name !== repository || run.path !== workflow || run.head_sha !== headSha
    || run.event !== 'push' || !numeric(run.id) || !numeric(run.run_attempt) || !text(run.head_branch)) fail('GitHub run identity does not match the requested branch head');
  if (run.status !== 'completed') fail('Newest run attempt has not completed');
  return {
    repository, workflow, headSha, subjectSha: headSha, runId: String(run.id), runAttempt: String(run.run_attempt),
    event: run.event, ref: `refs/heads/${run.head_branch}`,
  };
}

export function validateCapture({ folder, recipe, identity }) {
  if (identity.workflow !== recipe.capture.workflow) fail('Capture workflow does not match the recipe');
  inspectTree(folder);
  const manifest = jsonFile(ownedPath(folder, 'capture.json'));
  if (!object(manifest) || manifest.format !== 'memory-areas-pilot-1' || !object(manifest.capture)
    || !Array.isArray(manifest.cases) || !object(manifest.cleanup)) fail('Malformed behavior capture');
  for (const field of ['repository', 'workflow', 'headSha', 'subjectSha', 'runId', 'runAttempt', 'event', 'ref']) {
    if (manifest.capture[field] !== identity[field]) fail(`Capture identity mismatch: ${field}`);
  }
  if (!SHA.test(manifest.capture.headSha) || !SHA.test(manifest.capture.subjectSha)
    || manifest.capture.event !== 'push' || !manifest.capture.ref.startsWith('refs/heads/')
    || !Number.isFinite(Date.parse(manifest.capture.createdAt))) fail('Malformed capture provenance');
  if (manifest.error || manifest.cleanup.fixtureRemoved !== true || manifest.cleanup.evidenceRetained !== true) fail('Capture or cleanup is incomplete');
  const expected = new Set(recipe.scenarios.map(scenarioKey));
  const seen = new Set();
  const ids = new Set();
  const paths = new Set(['capture.json']);
  for (const record of manifest.cases) {
    if (!object(record)) fail('Malformed case record');
    scenarioReference(record.scenario);
    const key = scenarioKey(record.scenario);
    if (!expected.has(key) || seen.has(key) || !text(record.id) || !NAME.test(record.id) || ids.has(record.id)) fail('Unexpected or duplicate case record');
    seen.add(key);
    ids.add(record.id);
    if (!['captured', 'unavailable'].includes(record.state) || !object(record.command) || !text(record.command.executable)
      || !text(record.command.cwd) || !Array.isArray(record.command.argv) || !record.command.argv.length
      || record.command.argv.some(value => !text(value)) || !object(record.evidence)
      || !(record.exitCode === null || Number.isInteger(record.exitCode)) || !(record.signal === null || text(record.signal))) fail('Malformed case observation');
    if (record.state === 'unavailable' || (record.exitCode === null && record.signal === null)) fail('Capture command was unavailable');
    if (!object(record.fixture)) fail('Missing fixture observations');
    fixtureState(record.fixture.before);
    fixtureState(record.fixture.after);
    for (const stream of ['stdout', 'stderr']) {
      const evidence = record.evidence[stream];
      if (!object(evidence) || !DIGEST.test(evidence.sha256) || !Number.isSafeInteger(evidence.bytes) || evidence.bytes < 0) fail('Malformed stream evidence');
      if (paths.has(evidence.path)) fail('Duplicate evidence file');
      paths.add(evidence.path);
      const file = ownedPath(folder, evidence.path);
      if (lstatSync(file).size !== evidence.bytes || digest(readFileSync(file)) !== evidence.sha256) fail('Evidence digest or byte count mismatch');
    }
  }
  if (seen.size !== expected.size) fail('Missing scenario evidence');
  return manifest;
}

function comparisonMetadata(value) {
  return object(value) && DIGEST.test(value.inputSha256) && DIGEST.test(value.methodSha256)
    && object(value.environment) && ['node', 'platform', 'arch', 'locale'].every(key => text(value.environment[key]))
    && Object.keys(value).every(key => ['inputSha256', 'methodSha256', 'environment'].includes(key))
    && Object.keys(value.environment).every(key => ['node', 'platform', 'arch', 'locale'].includes(key));
}

// Eligibility only. A comparable pair can still show a product contradiction;
// the current written scenario remains the authority for grading both results.
export function compareCaptures({ folder, recipe, identity, baselineSha }) {
  const head = validateCapture({ folder, recipe, identity });
  const result = { state: 'unavailable', headSha: identity.headSha, baselineSha: baselineSha || null, cases: [] };
  if (!SHA.test(baselineSha)) return { ...result, reason: 'No full baseline revision was selected' };
  if (identity.subjectSha !== identity.headSha) fail('Comparison head must be the saved source revision');
  if (baselineSha === identity.headSha) return { ...result, reason: 'The selected baseline is the head, not an earlier revision' };
  const pair = head.pair;
  if (!object(pair) || pair.baselineSha !== baselineSha) return { ...result, reason: 'Capture does not contain the selected baseline' };
  if (pair.state !== 'captured') return { ...result, reason: 'The selected baseline was not captured' };
  if (pair.folder !== 'baseline' || pair.sourceRemoved !== true || pair.sourceRegistrationRemoved !== true) return { ...result, reason: 'Baseline source or evidence cleanup is incomplete' };
  let baseline;
  try {
    baseline = validateCapture({ folder: ownedPath(folder, pair.folder, true), recipe, identity: { ...identity, subjectSha: baselineSha } });
  } catch (error) {
    return { ...result, reason: error instanceof CaptureError ? `Baseline: ${error.message}` : 'Baseline evidence could not be read' };
  }
  const earlier = new Map(baseline.cases.map(record => [scenarioKey(record.scenario), record]));
  for (const after of head.cases) {
    const before = earlier.get(scenarioKey(after.scenario));
    const left = before.comparison;
    const right = after.comparison;
    let reason;
    if (!comparisonMetadata(left) || !comparisonMetadata(right)) reason = 'Comparison metadata is missing or malformed';
    else if (left.inputSha256 !== right.inputSha256) reason = 'Fixture inputs differ';
    else if (left.methodSha256 !== right.methodSha256) reason = 'Capture methods differ';
    else if (['node', 'platform', 'arch', 'locale'].some(key => left.environment[key] !== right.environment[key])) reason = 'Relevant environments differ';
    result.cases.push({ id: after.id, scenario: after.scenario, state: reason ? 'unavailable' : 'comparable', ...(reason ? { reason } : {}), before, after });
  }
  result.state = result.cases.every(record => record.state === 'comparable') ? 'comparable' : 'unavailable';
  if (result.state === 'unavailable') result.reason = 'One or more cases cannot be compared';
  return result;
}

const github = (args, cwd) => execFileSync('gh', args, { cwd, encoding: 'utf8', timeout: 60000, maxBuffer: 2 * 1024 * 1024, stdio: ['ignore', 'pipe', 'pipe'] });

export function collectCapture({ root, recipe, headSha, baselineSha, runDir, gh = github }) {
  if (!SHA.test(headSha)) fail('A full saved head revision is required');
  const owned = realpathSync(runDir);
  if (lstatSync(runDir).isSymbolicLink() || dirname(owned) !== realpathSync(tmpdir()) || !/^wong-verify-[a-zA-Z0-9_-]+$/.test(basename(owned))) fail('Collection needs an owned walkthrough folder');
  let download;
  try {
    const repository = JSON.parse(gh(['repo', 'view', '--json', 'nameWithOwner'], root)).nameWithOwner;
    if (!/^[a-zA-Z0-9_.-]+\/[a-zA-Z0-9_.-]+$/.test(repository)) fail('Invalid GitHub repository identity');
    const runs = JSON.parse(gh(['run', 'list', '--repo', repository, '--workflow', recipe.capture.workflow, '--commit', headSha,
      '--limit', '100', '--json', 'databaseId,headSha,event,createdAt,status'], root));
    if (!Array.isArray(runs) || runs.some(run => !object(run) || !numeric(run.databaseId) || !Number.isFinite(Date.parse(run.createdAt)))) fail('Malformed GitHub run listing');
    const matching = runs.filter(run => run.headSha === headSha && run.event === 'push').sort((a, b) => Date.parse(b.createdAt) - Date.parse(a.createdAt) || Number(b.databaseId) - Number(a.databaseId));
    if (!matching.length) fail('No branch-push capture run for this head');
    const apiArgs = ['api', `repos/${repository}/actions/runs/${matching[0].databaseId}`];
    const run = JSON.parse(gh(apiArgs, root));
    const identity = runIdentity(run, { repository, workflow: recipe.capture.workflow, headSha });
    if (identity.runId !== String(matching[0].databaseId)) fail('GitHub run ID mismatch');
    // API supplies attempt identity; run download never falls back after missing/invalid evidence.
    download = mkdtempSync(join(owned, `ci-${recipe.id}-`));
    gh(['run', 'download', identity.runId, '--repo', repository, '--name', recipe.capture.artifact, '--dir', download], root);
    const manifest = validateCapture({ folder: download, recipe, identity });
    const comparison = baselineSha ? compareCaptures({ folder: download, recipe, identity, baselineSha }) : undefined;
    const after = runIdentity(JSON.parse(gh(apiArgs, root)), { repository, workflow: recipe.capture.workflow, headSha });
    if (after.runAttempt !== identity.runAttempt) fail('Run attempt changed during collection');
    const evidenceRoot = join(owned, 'evidence');
    try { mkdirSync(evidenceRoot); } catch (error) { if (error.code !== 'EEXIST') throw error; }
    ownedPath(owned, 'evidence', true);
    const target = join(evidenceRoot, `ci-${recipe.id}`);
    // Never overwrite previous observations, including an incomplete collection.
    try { lstatSync(target); fail('Evidence folder already exists'); } catch (error) { if (error.code !== 'ENOENT') throw error; }
    renameSync(download, target);
    download = undefined;
    return { state: 'collected', folder: target, identity, cases: manifest.cases, cleanup: manifest.cleanup, ...(comparison ? { comparison } : {}) };
  } finally {
    if (download) rmSync(download, { recursive: true, force: true });
  }
}

if (isMain(import.meta.url)) {
  const { positionals, values } = parseCli({ usage: USAGE, allowPositionals: true, options: {
    recipe: { type: 'string' }, root: { type: 'string' }, sha: { type: 'string' }, 'run-dir': { type: 'string' }, 'baseline-sha': { type: 'string' },
  } });
  const [command] = positionals;
  if (positionals.length !== 1 || !['check', 'collect', 'compare'].includes(command) || !values.recipe
    || (command !== 'check' && (!values.sha || !values['run-dir']))
    || (command === 'compare' && !values['baseline-sha'])
    || (values['baseline-sha'] && !SHA.test(values['baseline-sha']))
    || (command === 'check' && (values.sha || values['run-dir'] || values['baseline-sha']))) usageError(USAGE);
  try {
    const root = resolve(values.root || '.');
    const recipe = checkRecipe({ root, recipePath: values.recipe });
    const result = command === 'check' ? { state: 'ready', recipe } : collectCapture({ root, recipe, headSha: values.sha, baselineSha: values['baseline-sha'], runDir: values['run-dir'] });
    console.log(JSON.stringify(result, null, 2));
  } catch (error) {
    // Tool errors may contain credentials or untrusted artifact text; print no raw command output.
    console.log(JSON.stringify({ state: 'unavailable', reason: error instanceof CaptureError ? error.message : 'GitHub capture could not be collected' }));
    process.exitCode = 1;
  }
}
