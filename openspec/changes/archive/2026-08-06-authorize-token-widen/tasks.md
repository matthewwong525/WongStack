## 1. The owning statement (wiki)

- [x] 1.1 In `wiki/stack/cloudflare-credentials.md`, add a named subsection under "How two checkboxes become enough" stating the standing authorization: providing a token with these two permission groups *is* the permission to widen it; an agent widens and reports rather than asking; the grant covers the widen only — billable creates/deletes still ask, a failed widen still stops, narrowing back is still offered.
- [x] 1.2 Place it so it reads with "The security trade-off, stated plainly" and `### Narrowing back` — the grant, its cost, and its reversal in one pass. Mark the subsection as the owner of the statement, the way the page already marks its ownership of the token variable's name.

## 2. The provisioning skill

- [x] 2.1 `SKILL.md` Boundaries: give `Ask before creating or deleting anything billable` its counterpart — the token widen is free and reversible and is out of that rule's scope; widen without asking, link to the credentials subsection from 1.1.
- [x] 2.2 `SKILL.md` Step 2 — the token widens itself: open with the imperative (do it without asking, say afterward which permissions were granted), keeping the existing stop-on-failure paragraph unchanged.

## 3. The references

- [x] 3.1 `references/permission-groups.md` — add the authorization to **The rules** as its own bullet, so an agent following the protocol outside the skill sees it. One sentence plus the link; the reasoning stays on the wiki page.
- [x] 3.2 `references/failure-map.md` — add a row for the run that stalled because the agent asked for permission to change the token's scope: cause "the standing authorization wasn't read", fix the credentials subsection.

## 4. The fragment

- [x] 4.1 `.claude/skills/wong-sync/references/stack-pack-fragments.md` — add one comment line above `CLOUDFLARE_API_TOKEN` in the `.env.example` fragment noting the token is expected to widen its own permissions, pointing at the credentials page. Keep it to one line; no restated rule in a template.

## 5. Release

- [x] 5.1 Bump `VERSION` to the next minor (9.3.0) — behavioural: a provisioning run now proceeds through the widen without prompting, and a fragment changed.
- [x] 5.2 Add the newest-first `CHANGELOG.md` entry for 9.3.0 describing the standing authorization and what it does not cover.
- [x] 5.3 Run `node scripts/check-payload-links.mjs` and resolve any dead link (conditional links are reported, not failures).
