# Design

## Context

See proposal.md for why. agent-browser already takes screenshots (`agent-browser screenshot [path]`, with `--if-changed` to skip unchanged ones). Paseo 0.9.2, the chat most people use, turns an image a tool returns into a picture in the chat: for Claude it pulls image blocks out of a tool result (for example the Read tool opening a PNG) and renders them inline; for Codex it does the same with its image-view item. A terminal session just shows a placeholder, which does no harm.

`wiki/development/home.md` *Saved browser logins* owns personal browsing; `.agents/skills/verify/references/walkthrough.md` owns how `/verify` walks. The `browser-logins` spec already forbids reading a picture of the page during a hand-over.

## Goals / Non-Goals

**Goals:**
- One place owns when and how to show the browser in the chat; `/verify` links it and adds only its own quirk.

**Non-Goals:**
- A new script, a live stream, image hosting, or any change to how `/verify` posts evidence to the pull request.

## Decisions

- **Show by opening the file with the host's image tool.** After `agent-browser screenshot --if-changed`, open the printed path with the image tool (Claude's Read, Codex's image view). Alternatives: a Markdown image link to the local file, which Paseo's code gives no sign of serving to a phone; uploading to a bucket, which most installs lack.
- **Key moments, not every action.** Chosen by the person. A new page, right before an outward action (send, book, pay, delete), and the result. `--if-changed` drops a repeat when nothing moved.
- **One caption line per picture**, in plain words, so the chat reads as a story on a phone.
- **`/verify` shows during grading (§ d).** Its batch runs every step at once, so "as it goes" means as each journey is graded: open that journey's numbered screenshots in order. Grading reads them anyway, so this adds little cost.
- **Home owns the how.** A new *Show what the browser is doing* subsection under *Saved browser logins*, beside *Hand the browser over*; the walkthrough links it. The AGENTS.md rule names it so an agent browsing without reading home still knows.
- **No pictures during a hand-over**, restating nothing: the new subsection links the existing rule.

## Risks / Trade-offs

- [Each picture costs tokens] → key moments only, plus `--if-changed`.
- [A picture of a bank page sits in the chat history] → the agent already reads that page's text; screenshots stay in agent-browser's temp folder and Paseo's private attachments folder, never the repo.
- [Paseo might render tool images differently on the phone] → read from Paseo 0.9.2's code, not yet seen on a phone; task 3.1 checks it.
