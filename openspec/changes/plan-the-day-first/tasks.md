# Tasks

## 1. Before building

- [x] 1.1 Confirm `inbox-private-links` (PR #435) is on `main` and bring `main` in; stop and report if it is not, since the migration, link rows and own-answer box depend on it

## 2. The inbox

- [x] 2.1 Add a migration after `20261023120000_inbox_link_items.sql` rebuilding `inbox_items` with `start` and `agent` in its kinds, and a sample day in `schema/seed.sql` (one agent per group); verify the migration test passes
- [x] 2.2 Accept `start` (state, plan shape and limits, `go` and `skip`) and `agent` (status shape, no taps) in `item-put.ts` and return both bodies as `detail` in `store.ts`; verify `api.test.ts` covers a sound and an oversized plan, a tap refused on an `agent` item, and a `go` tap
- [x] 2.3 Group `List.tsx` by workspace into Needs you, Working and Done with a new `AgentCard.tsx`, moving `Decision`, `PlanCard` and the link row inside unchanged; verify `App.test.tsx` covers each group, an agent moving to Needs you and back, a chat with no `agent` item, and the offline badge keeping the last status
- [x] 2.4 Add `toggle-group` with `npx shadcn@latest add toggle-group`, then `StartCard.tsx` (plan text, questions through the existing decision parts, Go / Not today pre-picked on Go, note, still-planning and no-plan states) and the send bar's *Start N agents* label; verify `App.test.tsx` covers mixed picks sent as one tap per card, an untouched card sent as Go, markup shown as text, and no hours shown

## 3. The daily skill

- [x] 3.1 Add `open --plan-first`, the watch's `planned`, planning `stopped` and `plans-ready` lines, `inbox add --kind start`, and `start` (Go reply, Not today archive and reminder, phase change) to `daily.mjs`; verify `scripts/tests/daily.test.mjs` covers each, the 15-minute cut-off, a malformed plan file, and an unavailable inbox
- [x] 3.2 Add the watch's `agent` status upsert (skipped when unchanged, closed on `gone` and at the end) and `done-agent`; verify `daily.test.mjs` covers a status change, an unchanged pass writing nothing, and the step cut to one line
- [x] 3.3 Update `SKILL.md` (morning steps open with `--plan-first`, then plan items on `plans-ready`, then `start` per answer) and `chief.md` (the *Plan first* brief part, one nudge then `no-plan`, never a bucket while planning, `done-agent` after proof, the in-chat fallback), cutting wording elsewhere to offset; verify `node scripts/measure-context.mjs --check` passes
- [x] 3.4 Add *Plan the day first* to `wiki/development/daily.md`, and say in `wiki/development/reply-links.md#in-your-inbox-first` that the inbox lists agents; verify `node scripts/check-payload-links.mjs` passes

## 4. Release

- [x] 4.1 Add a `## Next (minor) — One inbox for your agents, planned before they work` entry to `CHANGELOG.md` with no hand step; verify `node .github/scripts/checks.mjs --worktree` passes
- [ ] 4.2 `/save`, then on staging run `/daily` with two own-workspace steps: both plan and stop, both plan cards show under Needs you, sending one on Not today starts the other and closes the first's workspace, and the started one moves to Working with its latest step
