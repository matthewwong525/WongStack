# Design

## Context

See proposal.md for why. `verify-journeys.mjs replay` takes one `--url` and substitutes it for `{url}` in every kept check. The landing page in `site/` has its own preview: `.github/workflows/site.yml` deploys it only when a branch touches `site/` or that workflow, and posts the address on the head commit as the `landing-preview` commit status. The two checks under `.agents/verification/journeys/landing-site/` were recorded against that address, so on the app preview their steps find nothing and the replay says `changed`. The script ships to every install; `site/` and its workflow do not.

## Goals / Non-Goals

**Goals:**

- A kept check runs against the site it was recorded on, with no step for the assistant to remember.
- A missing second-site preview reads as `not-run`, never `changed`.

**Non-Goals:**

- A landing preview for changes that leave the landing page alone.
- A new result word. The four stay: `same`, `changed`, `skipped`, `not-run`.
- Teaching `preflight` or the fresh walk about second sites; the walk still reads the landing address as [the landing page](../../../wiki/maintaining/landing-page.md#check-preview-and-publish) says.

## Decisions

1. **One optional field, `site`.** `verify-journey-1` gains an optional `site`: a commit status context name, validated as a short name (letters, digits, `-`, `_`, `.`). Absent means the main preview, so every existing file stays valid and the format name does not change. Alternative: a full address in the file. Rejected: a kept file holds no address, and the address differs per branch.
2. **The replay resolves each named site once.** For the distinct `site` values among runnable checks, it reads the head commit's statuses with `gh api repos/<repo>/commits/<sha>/statuses` and takes the newest `success` status of that context, using its `target_url` when it is an `https` address. `--site-url <name>=<url>`, repeatable, supplies an address directly and skips the lookup: tests use it, and so can a repo with no GitHub. Alternative: the assistant passes every address. Rejected: a remembered step is the failure this change removes.
3. **No address settles early as `not-run`.** The reason reads `no <name> address was posted for this change`, or `the <name> address could not be read (<why>)` when `gh` fails. It joins `settledEarly`, so it opens no browser and spends none of the limit. The check for a rewritten promise (`skipped`) still comes first.
4. **A named site gets no Access credentials.** Its runner call drops `CF_ACCESS_CLIENT_ID` and `CF_ACCESS_CLIENT_SECRET` from the environment and sets `VERIFY_URL` to the site's address. A second site behind a login therefore answers with a login wall and reads `not-run`, as today; that result must not stop the checks of other sites, so the `stop` it sets applies only to checks of the same site.
5. **Staging rules stay as they are.** A named-site check still waits for `SEEDED=yes`, and a writing one still rebuilds staging. Loosening that for sites with no data is a separate decision.
6. **`keep --site <name>`.** It writes the field; `--url` is then that site's address, so `{url}` swapping works unchanged. The proof (`replay --from`) resolves the site the same way. `replay.json` records each result's `site` and the address used.
7. **The two landing checks** gain `"site": "landing-preview"` by hand, with no other edit. `thenDigest`, steps and `expect` are untouched.
8. **Words.** `wiki/development/kept-checks.md` owns the reasons: extend *It holds no address* and the `not-run` row. `walkthrough.md` § g gets one clause for `--site`, inside the instruction budget. `wiki/maintaining/landing-page.md`'s Preview step says kept landing checks replay there. Release level `minor`.

## Risks / Trade-offs

- [A commit status is writable by anyone who can push] → The address is opened in the throwaway browser with no credentials, and only `https` addresses are accepted.
- [A branch that touched the landing page, whose latest status is still pending or failed] → No `success` status means no address, so the checks read `not-run` with the reason; the landing page's own checks in CI still gate.
- [`gh` absent or signed out] → `not-run` with the reason; the main preview's checks are unaffected.
- [Two lines of `not-run` on most publishes] → Honest and cheap: they name a check that could not run, in one line each, with no fresh look.
