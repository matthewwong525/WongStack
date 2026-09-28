## 1. Wiki

- [x] 1.1 In `wiki/development/home.md` *Hand the browser over*, add an **Ask first** bullet after **When**: ask in the chat whether the person is ready and open the link only on their reply, unless their latest message asked to take over, because a link dies after 10 minutes and a question waits
- [x] 1.2 In the same section's **When** bullet, say a yes or no (publish it? send it?) is a chat question, never a hand-over
- [x] 1.3 In *Show what the browser is doing*, add publishing to the key moments and say the picture before a publishing, sending, booking, paying, or deleting action goes with a chat question the agent waits on

## 2. Release

- [x] 2.1 Add a `## Next (minor) — Ask in chat before handing the browser over` entry at the top of `CHANGELOG.md`'s entries
- [x] 2.2 Run `node scripts/check-payload-links.mjs` and `node scripts/check-openspec-config.mjs`; fix any failure
