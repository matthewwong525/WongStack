# Design

## Context

The key link is the hand-over skill's private key page: `keys.mjs` serves and stores, `keys-page.mjs` runs on the person's device. Today `LIMITS.value = 4096` (stored form, `\n` counted as two characters), `LIMITS.body = 16 * 1024` (413 past it), and the page's `FILE_LIMIT = 16 * 1024` reads a file with `file.text()`, which turns a binary file's bytes into U+FFFD characters.

## Decisions

- **Limits.** `LIMITS.value = 32 * 1024`, `LIMITS.body = 128 * 1024`, page `FILE_LIMIT = 24 * 1024`. 24 KB of bytes is 32 KB of base64, so any accepted file fits one value. A body holds about four full keys; more gives the existing *That's too much at once* message.
- **Text or not.** `fileValue(bytes)` returns `{ text }` when a strict UTF-8 `TextDecoder` decodes the bytes and they hold no zero byte, else `{ base64 }`, encoded in 32 KB chunks through `btoa`. `pickFile` reads `file.arrayBuffer()`. An empty file still says *That file is empty.* Deciding by extension was rejected: it misses unnamed binary files, and a phone may hide the extension.
- **The held line.** A text file keeps its name and line count. A base64 file shows `<name> · <size> KB, saved as base64`, rounded up, through `fileLabel`. Neither shows content.
- **The server.** No new code: base64 is one line of `BARE` characters, so `cleanValue` keeps it and `formatLine` writes it unquoted.

## Risks / Trade-offs

- A Worker secret over Cloudflare's 5 KB limit saves to `app/.dev.vars` but fails at `npm run secrets:push`. The guide says so in one clause.
- A Latin-1 text file that is not valid UTF-8 arrives as base64. Rare for a key file; the label says *saved as base64*, so the person sees it.
