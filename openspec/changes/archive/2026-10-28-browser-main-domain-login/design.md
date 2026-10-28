## Context

`login` in `.agents/skills/browser/scripts/browse.mjs` types a saved login only when `sameSite(host, savedHost)` holds for the tab and for each box's frame. WongOS adds a flag that also accepts a host with the same main domain.

## Decisions

1. **`mainDomain(host)`** returns the last two labels, or the last three when the second-to-last is a country's own second level (`co`, `com`, `net`, `org`, `gov`, `ac`, `edu`) under a two-letter top level: `bbc.co.uk`. An IP address or a host with a port returns as it is. No public-suffix list: it would add a package, and a wrong guess only fails closed or needs the flag.
2. **`login(..., { 'main-domain': loose })`**: `hostOn` is `sameSite(...) || (loose && both hosts && mainDomain(a) === mainDomain(b))`. The same check runs for the tab and for each frame box, so a frame from another main domain still gets nothing.
3. **One try is the agent's rule**, written in `wiki/development/browsing.md`; the script does not count tries.

## Risks

- A shared hosting domain (`*.github.io`) would match its siblings with the flag. The flag is never default, and the guide limits it to one try on a site the person uses.
