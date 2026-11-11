#!/usr/bin/env node
// UserPromptSubmit hook: add the summary of each topic a message names, once per chat, from files on this computer
// only. It never blocks a message: any failure prints nothing, and it always exits 0.
import { readdirSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { parseCli } from './lib/cli.mjs';
import { matchTopics } from './lib/topics.mjs';
import { SCRIPT, isMain, loadProfile, readJson, repoContext, statePath, writeJson } from './lib/store.mjs';

const dirNames = dir => { try { return readdirSync(dir); } catch { return []; } };

// The hook's output for one message, or '' when it adds nothing.
export async function topicMatch(input) {
  if (!String(input.prompt || '').trim()) return '';
  const ctx = repoContext(input.cwd || process.cwd());
  const profile = await loadProfile(ctx);
  if (!profile?.topics) return '';
  const shownFile = statePath(ctx, 'shown-topics', `${String(input.session_id || 'unknown').replace(/[^\w.-]/g, '_')}.json`);
  const shown = readJson(shownFile, []);
  const skills = [...dirNames(join(ctx.root, '.claude', 'skills')), ...Object.keys(profile.steps || {})];
  const hits = matchTopics(input.prompt, await profile.topics(ctx), { skip: shown, skills });
  if (!hits.length) return '';
  writeJson(shownFile, [...shown, ...hits.map(({ topic }) => topic.tag)]);
  const lines = hits.map(({ topic, clear }) => (clear ? `Topic ${topic.tag}: ${topic.summary}` : `Topic ${topic.tag}`));
  const additionalContext = [...lines, `Pull a topic: \`${SCRIPT} pull <topic>\``].join('\n');
  return `${JSON.stringify({ hookSpecificOutput: { hookEventName: 'UserPromptSubmit', additionalContext } })}\n`;
}

if (isMain(import.meta.url)) {
  parseCli({ usage: 'usage: topic-match.mjs   the UserPromptSubmit hook; reads the hook\'s JSON on stdin' });
  let out = '';
  try { out = await topicMatch(JSON.parse(readFileSync(0, 'utf8') || '{}')); } catch { /* never blocks a message */ }
  process.stdout.write(out, () => process.exit(0));
}
