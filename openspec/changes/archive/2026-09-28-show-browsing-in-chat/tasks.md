# Tasks

## 1. Docs

- [x] 1.1 Add a *Show what the browser is doing* subsection to `wiki/development/home.md` under *Saved browser logins*: key moments, `agent-browser screenshot --if-changed`, open the file with the host's image tool, one caption line, temp folder only, none during a hand-over (link *Hand the browser over*). Verify every rule in the `browser-logins` delta appears there and the page reads in [our voice](../../../wiki/voice.md).
- [x] 1.2 In `.agents/skills/verify/references/walkthrough.md` § d, show each browser journey's screenshots in the chat in walk order while grading, linking the home subsection. Verify the `staging-walkthrough` delta's scenario is covered.
- [x] 1.3 Extend the `AGENTS.md` rule *Browse as the person* to name showing key moments, with a link to the new subsection. Verify the line still reads as one rule.

## 2. Release

- [x] 2.1 Add a `## Next (minor) — Watch the agent browse, in the chat` entry at the top of `CHANGELOG.md`, with an **Updating.** line saying nothing to do by hand. Verify `node scripts/check-payload-links.mjs`, `node scripts/check-openspec-config.mjs`, and `node scripts/check-retired-names.mjs` pass.

## 3. Check it works

- [x] 3.1 In this chat, take a screenshot of any page with agent-browser and open it with the image tool; ask the person to confirm it shows as a picture in Paseo on their phone. If it doesn't, stop and report before `/save`.
