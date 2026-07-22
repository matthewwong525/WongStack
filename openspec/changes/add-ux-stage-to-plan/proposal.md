# Add a UX stage to /plan (stack-neutral)

**Status:** ready-to-ship
**Open questions:** none

## Why

Upstreamed from **ClaymooApp**, where a `/plan` UX stage was proven on a UI-heavy Cloudflare Workers app. UI-bearing changes currently ship with the whole UX improvised at `/apply` time — design.md captures architecture, never *what a screen should be*. WongStack had no design-judgment convention at all. This brings the ClaymooApp capability up, generalized so it holds for any stack and stays out of the way for UI-less repos.

## What Changes

- **New payload doc `docs/ux-principles.md`** — the judgment layer beside `wiki-style`/`voice`: use-case-first brief (who, the job, what *done* looks like, context of use, common-vs-edge, stated frequency assumptions), the shortest flow from intent to done, and Refactoring-UI principles (hierarchy, one primary action per screen, emphasize-by-de-emphasizing, weight/color before size, designed empty states, fewer borders). Ends with the `## UX` design.md section template. Stack-neutral — no design-system tokens; it points at *your* repo's UI conventions for mechanics. Marked conditional: UI-less repos ignore it.
- **`.claude/skills/plan/SKILL.md`** — new "UX stage (UI-bearing changes only)": a design subagent drafts the `## UX` section by mirroring the closest existing screen; a critic subagent checks it against `ux-principles.md`; one revision round; tasks reference the subsection they implement. UI-less changes skip the stage.
- **`openspec/config.yaml`** — a `design` rule (UI-bearing → carry a `## UX` section per `ux-principles.md`; skip UI-less) and a `tasks` rule (UI tasks cite the `## UX` subsection), so any author — not just `/plan` — is held to the shape.
- **Installer + contribute wiring** — `install-wong-stack` offers `ux-principles.md` only when the target has UI (never forced into a CLI/library/backend, on install or update); `contribute-wong-stack` adds it to the payload manifest so it round-trips. `docs/README.md` registers it.
- **Release** — VERSION 4.5.0 → 4.6.0; newest-first CHANGELOG entry.

**Non-goals:** No OpenSpec schema fork or new artifact type (the `## UX` section rides in design.md via config rules — the supported Level-1 extension). No changes to `/apply`, `/save`, `/ship`. No forcing UX guidance onto UI-less repos. No visual-design tooling at plan time.

## Impact

- `docs/ux-principles.md` (new), `docs/README.md` (register)
- `.claude/skills/plan/SKILL.md` (UX stage), `openspec/config.yaml` (design + tasks rules)
- `.claude/skills/install-wong-stack/SKILL.md` + `.claude/skills/contribute-wong-stack/SKILL.md` (payload wiring)
- `VERSION` + `CHANGELOG.md` (release ritual)

## Decision log

- **2026-07-21** — Ported from ClaymooApp's `add-ux-design-stage`. Generalization decisions: (1) dropped all design-system specifics (shadcn tokens, `<Empty>`, PostHog, app personas) and repointed at "your repo's UI/component conventions"; (2) gated the doc to UI-bearing repos — the installer *offers* it only when research finds a frontend, never forces it into UI-less repos on install or update; (3) kept the `## UX`-section-in-design.md mechanism and the config `design`/`tasks` rules verbatim in spirit (Level-1 extension, no schema fork). Implemented in this same change; all tasks done.
