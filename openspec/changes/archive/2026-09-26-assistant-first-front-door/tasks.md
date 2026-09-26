## 1. CLAUDE.md (`AGENTS.md`)

- [x] 1.1 Replace the STE100 rule and "Answer in a few lines" with one "Keep messages short and plain" rule that links `wiki/voice.md`
- [x] 1.2 Move "Do a plain request directly" to the top of the rules
- [x] 1.3 Reword the meta intro (outside the `WONG-STACK` block) to call WongStack a personal assistant and knowledge center that lives in a repo

## 2. Skill reference

- [x] 2.1 In `.agents/skills/explore/references/asking-the-user.md`, point the STE100 line to the voice page's short-and-plain rule

## 3. Wiki

- [x] 3.1 Add the everyday-words line to `wiki/voice.md`, and make it the page the block rule links
- [x] 3.2 Open `wiki/README.md` with what the assistant does, and link getting started for a first-time reader
- [x] 3.3 In `wiki/stack/getting-started.md`, show asking for anything first and the change loop second in "how you work"

## 4. README

- [x] 4.1 Rewrite the first screen: what the assistant does, example requests, three setup steps, and where to chat, with no developer terms
- [x] 4.2 Move the commands, comparison, requirements, layout, and work-from-source sections under `## For developers`, with their content complete

## 5. Specs and release

- [x] 5.1 Update the Purpose of `openspec/specs/simplified-technical-english/spec.md` to describe short, plain messages
- [x] 5.2 Bump `VERSION` to 23.1.0 and add the `CHANGELOG.md` entry
- [x] 5.3 Run `node scripts/check-payload-links.mjs` and `node scripts/check-openspec-config.mjs`
- [x] 5.4 Confirm no "STE100" or "Simplified Technical English" remains in `AGENTS.md` or `.agents/skills/` (outside archived history)
