# Tasks

The source text and the table of what is true today are in design.md - Context. Write every sentence in the wiki's voice (`wiki/voice.md`), and name no other assistant or product to compare or criticise.

## 1. README

- [x] 1.1 Rewrite the opening of `README.md` by design.md - Decision 1: the vision in Matthew's words and order, each of the three bullets with one example request, his first-person paragraph, and the closing line. Verify by reading it against the source text: nothing added that the text or his points do not say.
- [x] 1.2 Rewrite *Start in three steps*: step 1 **Open your assistant**, step 2 **Paste this into a new chat**, step 3 unchanged. Keep the heading text and the fenced message byte for byte. Verify `git diff README.md` shows no change inside the fenced block and the heading line.
- [x] 1.3 Regroup *What you get* under Build, Remember, Get things done, keeping the ownership and no-lock-in points and every existing link. Add *What I use* with the two limits, each linked to its owning page (`wiki/development/required-tools.md`, `wiki/development/memory.md`). Reword *Requirements* to "an assistant and a Cloudflare account". Verify no sentence says Claude Code or Paseo is needed, and none says several people can publish to a project kept in Cloudflare.
- [x] 1.4 Confirm the README still links `LICENSE`, `SECURITY.md`, and `wiki/agent-knowledge-center.md`, and still names Matthew and Claymoo on its first screen. Verify by reading.

## 2. Wiki and setup wording

- [x] 2.1 `wiki/README.md`: rewrite the opening paragraph by design.md - Decision 2, two sentences, link to getting started kept. Verify the first sentence still says what the page is.
- [x] 2.2 `wiki/stack/getting-started.md`: merge the first two hand-done steps into one neutral step, move Paseo to one optional sentence linking `../development/required-tools.md`, fix "The first two happen" and the numbering. Verify the list has six items and names no chat app.
- [x] 2.3 `wiki/development/required-tools.md`: retitle and rewrite the **Paseo is where you chat.** paragraph by design.md - Decision 2, keeping each true limit. Verify every limit in the old paragraph is still stated.
- [x] 2.4 `wiki/maintaining/landing-page.md`: add the examples rule under *Change what it says about installing*. Verify it links `site/src/install.ts`.
- [x] 2.5 `.agents/skills/wong-setup/references/cloudflare.md`: change the closing report's line to *"Next time, open <target> in your assistant to chat."* Verify the new line is no longer than the old one.
- [x] 2.6 `openspec/config.yaml`: change the context's first sentence by design.md - Decision 3. Verify the file's other lines are untouched.
- [x] 2.7 Search once more for pages that state either product as needed: `git grep -n -i -E "claude code|paseo" -- README.md wiki AGENTS.md SECURITY.md .github/CONTRIBUTING.md .agents/skills/wong-setup`. Fix any sentence that tells a reader to get one; leave true limits and optional mentions. Verify by listing each remaining hit with why it stays, in the Decision log if one is surprising.

## 3. Landing page

- [x] 3.1 Replace the moving headline: remove `site/src/Rotator.tsx`, its import and use in `Landing.tsx`, the `.rotator*` rules and the three `@font-face` blocks in `index.css`, and the three files in `site/public/fonts/` once nothing loads them. The hero's `h1` is the plain line from design.md - Decision 4. Verify `git grep -n -i "rotator\|but yours" site/src site/index.html` returns nothing outside `compare.ts` and `Compare.tsx`.
- [x] 3.2 `site/src/install.ts` and `InstallSteps` in `Landing.tsx`: the first step reads neutral words first, then Claude Code and Codex as linked examples. Update `install.test.ts` and the steps test in `Landing.test.tsx` to assert that order.
- [x] 3.3 `Landing.tsx`: the note under the hero picture and in the phone tour, Paseo's line in the open-source list, the two reworded answers, the team answer checked against design.md's table, and the closing band's added line. Update the matching assertions in `App.test.tsx` and `Landing.test.tsx`.
- [x] 3.4 `site/index.html`: the description, `og:description`, `twitter:description`, and `og:image:alt` take the new line. `site/brand/share-image.svg`: the two text lines change; re-render `site/public/share.png` by the SVG's opening comment. Update `shareCard.test.ts`'s `LINE` and alt text. Verify the PNG is 1200×630 and under 300 KB.
- [x] 3.5 Tests for the new promise, beside the source: in `App.test.tsx`, replace the rotator test with one that reads the `h1` and asserts it names none of the comparison table's products; in `Site.test.tsx`, update the heading it finds; add one assertion that the first install step's text begins with the neutral words. Keep the hosting-words test untouched.

## 4. Release

- [x] 4.1 Add `## Next (patch) — <Title>` at the top of `CHANGELOG.md`'s entries, in plain words: the README and guides tell what WongStack is for and name no assistant as needed. **Updating.** Nothing needs doing by hand. Leave `VERSION` alone.

## 5. Verification

- [x] 5.1 Run `openspec validate "tell-the-new-vision" --strict --no-interactive` and expect it valid.
- [x] 5.2 Run `node .github/scripts/checks.mjs --worktree` and repair what fails: it covers the payload links, the OpenSpec config, the skills' text budget, the wiki checks, and `scripts/tests/landing-site.test.mjs`.
- [x] 5.3 In `site/`, run `npm test` and `npm run build`; expect both to pass.
- [ ] 5.4 After `/save`, open the landing page's own preview (the `landing-preview` status on the commit) at phone width and at desktop width: the headline fits without sideways scrolling, the note sits under each picture, and the first install step reads neutral words first. Open the README as GitHub renders it on the branch and read the first screen.
