# Design

## Context

`LICENSE` holds the MIT text with `Copyright (c) 2026 Matthew Wong`. `README.md` names MIT in its badge alt text (line 4), its file table (line 123), and its *License* section (line 149). The badge image comes from `img.shields.io/github/license/...`, so it follows GitHub's detection with no edit. The `open-source-release` spec requires an MIT `LICENSE`. None of these files is in the payload manifest (`.agents/skills/wong-sync/references/payload-manifest.md`), so installs get nothing from this change.

## Goals / Non-Goals

**Goals:** GitHub detects Apache-2.0; the README and the spec agree with the file; the copyright line survives.

**Non-Goals:** per-file license headers; relicensing adapted third-party skill material, which keeps its upstream license by the `payload-layout` spec; rewriting archived changes.

## Decisions

- **Verbatim text from apache.org.** `LICENSE` is `https://www.apache.org/licenses/LICENSE-2.0.txt` byte for byte (SHA-256 `cfc7749b96f63bd31c3c42b5c471bf756814053e847c10f3eb003417bc523d30`), appendix placeholders included. GitHub's licensee matcher scores the standard text highest; filling the appendix still matches, but a verbatim file needs no judgment.
- **Copyright in `NOTICE`.** Apache 2.0 section 4(d) carries a `NOTICE` file into derivative works, so the attribution the MIT file held moves there: `WongStack` and `Copyright 2026 Matthew Wong`.
- **README table row** lists `NOTICE` beside `LICENSE` and says *Apache 2.0 terms*.

## Risks / Trade-offs

- Earlier clones stay MIT for the copies they already have; the owner confirmed no one has used it, so this is moot.
