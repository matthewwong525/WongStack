# Retained live acceptance

Implementation authoring is complete. Local fixtures are synthetic; they do not establish later-session capability. Tasks 7.2's actual record publication, 7.4, 7.5 and 7.6 remain parent-owned. No business schedule, call, message or deployment is authorized by this trial.

## Published instructions prerequisite

1. Use `/save` for this implementation branch with the remaining acceptance tasks honestly unchecked. Preserve the normal gate. Do not merge the implementation merely to make a fixture reachable.
2. Parent creates a separate private synthetic repository whose initial default-branch baseline is the gated source snapshot, outside `.paseo/worktrees/`. Remove production workflows/config/credentials and the active implementation plan from that initial baseline; keep helpers/schema and a review gate when no CI is configured. A fixture branch based on the implementation branch cannot pass record-only scope because it carries source changes. Publish each selected synthetic record on its own branch in this isolated repository. The implementation remains unmerged and trial data stays outside its checkout.
3. Use only owner-labelled synthetic state in a durable private local directory, e.g. `$XDG_DATA_HOME/wongstack/schedule-trials/<trial-id>/` (fall back to the OS user's data directory). Do not write credentials or copy installation identity. The two records each choose one separate local continuation file and share only a synthetic input file with `{ "complete": false }`. No production integration is connected.

## Concrete record and native contract

In the isolated trial repository, set `TRIAL_REPOSITORY` to its actual credential-free remote, `TRIAL_DATA` to an absolute private trial directory and `TRIAL_UPTIME` to the actual computer/daemon that must remain running. This prepares unpublished drafts with every unobserved capability false. Publish the draft record, then parent gathers bounded, genuinely later read-only probe evidence in `capabilities.json` there. It must observe PASEO_AGENT_ID in the probe's active native run, read published instructions, prove exclusive claim/read/write and owned update/stop. A synthetic inbox proves only the trial's question surface. Checkpoint observed capability evidence through record-only delivery before registration; never fill unobserved capabilities with true.

```sh
node --input-type=module <<'NODE'
import { readFileSync, writeFileSync, mkdirSync, existsSync } from 'node:fs';
import path from 'node:path';
import { routineRevision, digest } from './.agents/skills/schedule/scripts/lib/records.mjs';
const data = process.env.TRIAL_DATA, repository = process.env.TRIAL_REPOSITORY;
if (!data || !path.isAbsolute(data) || !repository || !process.env.TRIAL_UPTIME) throw Error('Set actual TRIAL_DATA, TRIAL_REPOSITORY and TRIAL_UPTIME');
mkdirSync(data, { recursive: true, mode: 0o700 });
const evidenceFile = path.join(data, 'capabilities.json');
const capabilities = existsSync(evidenceFile) ? JSON.parse(readFileSync(evidenceFile, 'utf8')) : {
  futureVerified: false, oneOff: false, recurrence: false, freshSession: false, inspect: false,
  update: false, stop: false, progressRead: false, progressWrite: false, nonOverlap: false, questionDelivery: false,
  context: { location: 'local', uptime: process.env.TRIAL_UPTIME },
};
const authority = { actions: ['read'], recipients: [], channels: [] };
const now = Math.ceil(Date.now() / 60000) * 60000;
const at = minutes => new Date(now + minutes * 60000).toISOString();
const input = path.join(data, 'input.json');
writeFileSync(input, JSON.stringify({ complete: false }), { mode: 0o600 });
const baseTiming = { timezone: 'UTC', every: '5m', earliest: at(0), latest: at(75), expiresAt: at(90), allowedLatenessMs: 60000 };
const bind = (key, record, timing, revision) => ({
  version: 1, key, owner: 'schedule-trial@example.test', repository, record, revision,
  execution: { type: 'assistant', host: 'paseo', nativeId: null, generation: 1, capabilities,
    context: { location: 'local', cwd: process.cwd(), provider: 'codex', uptime: capabilities.context.uptime } },
  progress: { type: 'local', reference: path.join(data, `${key}.json`) }, timing, authority,
  lifecycle: { state: 'registering', published: false },
});
const key = 'host-schedule-trial-routine';
const routine = { version: 1, kind: 'routine', key, name: 'Read synthetic trial input',
  owner: 'schedule-trial@example.test', instructions: `Read ${input}; record a digest locally. No business integration or outreach.`,
  execution: { type: 'assistant' }, authority, timing: { ...baseTiming, mode: 'recurring' } };
routine.binding = bind(key, `schedules/${key}.json`, routine.timing, routineRevision(routine));
writeFileSync(path.join(data, 'routine-request.json'), JSON.stringify(routine, null, 2));
const name = 'host-schedule-trial-goal';
const sections = {
  Goal: 'Observe synthetic completion, then stop only this trial trigger.',
  Instructions: `Read ${input}. Use executeRun with verified native identity and local-only adapters. Choose a bounded, minute-aligned nextAt for ordinary and waiting checks. Never send/call.`,
  'Completion source': input,
  Authority: 'Read trial files only; no outreach or business changes.',
  Timing: `UTC every5m; latest ${baseTiming.latest}; expires ${baseTiming.expiresAt}.`,
  'Questions and cancellation': 'One synthetic inbox item; exact owner answer only. Silence grants no authority. Stop only the captured trial native ID.',
};
const proposal = `# Goal: ${name}\n\n` + Object.entries(sections).map(([heading, body]) => `## ${heading}\n${body}\n`).join('\n');
const binding = bind(name, `openspec/changes/${name}`, { ...baseTiming, mode: 'goal' }, digest(proposal));
binding.completionSource = input; binding.questionSurface = path.join(data, 'inbox.json'); binding.adaptive = false;
writeFileSync(path.join(data, 'goal-request.json'), JSON.stringify({ name, proposal, binding,
  tasks: '- [ ] Observe authoritative synthetic completion and verified owned stopping.\n' }, null, 2));
NODE
node .agents/skills/schedule/scripts/schedule.mjs create-routine --file "$TRIAL_DATA/routine-request.json"
```

Parent publishes that routine alone before creating the goal on a separate clean record branch:

```sh
node .agents/skills/schedule/scripts/schedule.mjs create-goal --file "$TRIAL_DATA/goal-request.json"
node .agents/skills/schedule/scripts/schedule.mjs list
```

Retain the goal's actual CLI-returned `reference` (and selected `--store <id>` consistently if used). Record-only checkpoint/prepare/finish uses `--schedule-record <exact-reference>`; goals retain unchecked tasks. After each actual merge, use `checkpoint(loadRecord(...), binding)` to set lifecycle published true and publication to `<actual-repository>@<actual-merged-commit>:<record-path>`, then publish that exact binding checkpoint through the same selected record route. This is instruction publication, not implementation publication or proof of activation.

Both bindings have version1, unique trial key, synthetic owner, credential-free published repository reference, exact record path, approved revision, `execution: {type: assistant, host: paseo, nativeId: null, generation: 1, capabilities, context: {location: local, cwd: <durable-trial-checkout>, provider: codex, uptime: <actual-daemon/computer>}}`, sole local progress reference, explicit authority `{actions:[read],recipients:[],channels:[]}`, and lifecycle registering. The routine timing is recurring every5m. The finite timing is goal every5m with UTC, absolute earliest/latest/expiry and allowedLatenessMs. Give both a short expiry so abandoned trials cannot run indefinitely. One-time/adaptive rearming through Paseo requires minute-aligned absolute times.

Capability evidence must come from an actual harmless later probe: read its published record, inspect its own native job, read/write the selected continuation, acquire/release its claim, and inspect/update/stop a trial-owned job. Keep unavailable capabilities false; do not fabricate `futureVerified`. Read-only probe creation is an explicitly authorized diagnostic trial, not business adaptive activation.

The public native adapter is `paseoAdapter()` in schedule/scripts/lib/hosts.mjs: public `paseo schedule create <startupPrompt(binding)> --name wong-<key>-<operation> --cwd <durable-clone> --provider codex --every 5m --expires-in <bounded-duration> --json`. There is no paused-create/isolation flag here. Publish guarded instructions before creating; persist operation IDs and inspect/read back lost responses. Do not use `--run-now` as evidence of a later session.

After a helper-created native receipt: `register --record <ref>`, `bind --record <ref>`, record-only publish the bound checkpoint with the actual immutable instructions publication reference, then `reconcile --record <ref>`. Reconciliation checks future capabilities and exact guarded prompt, native active state and nextRunAt. Adoption uses the same ID, explicit prompt repair and guarded resume; no second trigger.

## Observe later runs

Paseo fresh agents expose PASEO_AGENT_ID. `start --record <ref> --native-id <id> --generation 1 --revision <sha>` requires that agent in the exact job's active runs. It holds a local claim; `release --record <ref> --run-id <id>` releases it. For an executable trial harness, alternatively call `executeRun` with actual native ownership verified first; it takes its own claim. Do not acquire both claims.

Use actual local read-only adapters: `checkCompletion` reads the synthetic input; `performAction` reads it and records a digest as evidence; `deliverQuestion` writes one synthetic inbox item in the trial directory and exposes it in the native run result. No send/call adapter exists. `chooseStep` uses the persisted progress to demonstrate these phases:

- Routine: a later run reads published instructions and input, persists its result, and leaves the native recurrence active. Inspect its native run history and nextRunAt, and verify no OpenSpec routine goal appeared.
- Goal first run: check synthetic completion false, persist a read receipt, leave the ordinary fixed cadence intact. Inspect the same native ID after session end and observe the next naturally scheduled session. Native timing update capability stays false; do not patch or restart Paseo.
- Goal later run: retain one pending synthetic question/deferred read. Observe waiting and no duplicate question on another check. Parent answers its exact question ID as the identified synthetic owner using `answer`; resume the same native job if the record route pauses it. A timeout must produce no answer.
- Set synthetic completion true. The next native session must check it before work, persist the terminal guard, cancel/read back only its own trigger, checkpoint completion evidence and verified stop, then use the terminal record archive route. The original goal remains open until that evidence; cancellation/archival touches no capability spec.

Record exact native IDs, agent IDs, observed timestamps, publication revision, read/clock/stop receipts and question transitions in trial evidence; exclude prompts containing private data and credentials. Actual other-host tools must prove their own later access; absent Codex/Claude tools and Claude cloud self-management remain reported limits, never passes.

## Cleanup and final preview

Parent owns trial cleanup: pause/cancel only the two captured trial IDs, inspect absence, remove their selected routine/goal records through exact record delivery, then remove only this trial's local directory/clone. Preserve every pre-existing native/cloud job, secret and resource. Rebuild the implementation review page, attach observed evidence/limits and provide the host preview or read-only evidence. Task7.6 does not authorize publishing business code or activating business work.

## Chosen final trial mode

The owner chose ordinary periodic Paseo goal checks. Author the harmless fixture with `adaptive:false`, `update:false`, `updateAfterRun:false`, no requested `nextAt`, read-only actions, one-minute cadence and bounded expiry. Every actual later session checks completion even while waiting. Verify two successful routine reads, goal read, one question, another waiting session without duplicate/deferred work, the identified synthetic answer, a subsequent authorized read, and completion-based owned cancellation/archive. Retain optional adaptation safeguards, but do not treat the installed host’s unavailable exact clock changes as a blocker for the chosen fixed mode. No shared host modification or restart is authorized.
