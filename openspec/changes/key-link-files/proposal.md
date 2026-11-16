# The key link takes longer keys and any file

**Status:** ready-to-ship
**Branch:** key-link-files
**Open questions:** none

## Why

The private key link refuses a key over 4,096 characters with *Couldn't save this one; check it and try again*. A code-signing certificate is about 5,000 to 6,000 characters as base64, so a repo that signs its apps can't save one through the link. Its *pick a file* button also reads every file as text, so a certificate file (`.p12`, `.der`), which is not text, arrives broken.

## What Changes

- **A key can be up to 32 KB.** That is eight times today's limit. It holds a signing certificate, a long key file, or a chain of certificates. GitHub holds up to 48 KB a secret, so each saved key still fits there.
- **Any file goes through *or pick a file*.** A text file, such as a JSON key file, works as today. A file that is not text, such as a `.p12` certificate, is changed on the person's own device to base64: one line of plain letters and digits, which a build step decodes back to the same bytes. The page shows the file's name and size, never its content. A file can be up to 24 KB.
  ```screen
  <div class="card col gap phone">
    <h3>Signing certificate</h3>
    <p class="muted">SIGNING_CERT_P12</p>
    <p>Paste it here</p>
    <p>Certificates.p12 · 4 KB, saved as base64</p>
    <div class="row gap"><button class="btn-ghost">Pick another file</button><button class="btn-ghost">Remove</button></div>
    <div class="row gap"><span class="grow"/><button class="btn-primary">Save and continue</button></div>
  </div>
  ```

**Non-goals:** a separate file-upload route; a lower limit for Worker secrets.

## What the build needs

- **Nothing.**

## Capabilities

### New Capabilities

None.

### Modified Capabilities

- `secrets-convention`: the key page takes a file that is not text, stored as one base64 line that decodes to the same bytes, and shows it by name and size.

## Impact

- `.agents/plugins/browser/skills/hand-over/scripts/keys.mjs`: `LIMITS.value` and `LIMITS.body`.
- `.agents/plugins/browser/skills/hand-over/scripts/keys-page.mjs`: `FILE_LIMIT`, `fileValue`, `fileLabel`, and how a picked file is read.
- `.agents/plugins/browser/skills/hand-over/references/key-link.md`: one sentence on sizes and files.
- `scripts/tests/keys.test.mjs`, `scripts/tests/keys-page.test.mjs`.
- `.agents/plugins/browser/VERSION` and `CHANGELOG.md`: a `minor` entry.

## Decision log

- **2026-11-16** — Assumed: the limit is 32 KB a key and 128 KB a request, because a code-signing `.p12` is about 6,000 characters as base64 and GitHub holds at most 48 KB a secret; 64 KB would pass GitHub's limit.
- **2026-11-16** — Assumed: a picked file that is not text is sent as one base64 line, because build steps read certificates back with `base64 --decode`, and base64 is plain characters that the key file stores bare.
- **2026-11-16** — Assumed: the page tells text from other files by its bytes, strict UTF-8 with no zero byte, because a file's name or type says nothing reliable on every phone.
- **2026-11-16** — Assumed: one limit for every key, with no lower one for Worker secrets, because only Worker keys reach Cloudflare, whose 5 KB limit makes `npm run secrets:push` fail; the guide says so.
