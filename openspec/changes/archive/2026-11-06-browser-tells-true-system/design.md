# Design

## Context

`launch-config.py` passed `os='linux'` to `launch_options` and `generate_fingerprint` on every computer. On a Mac, Camoufox 0.5.9 then registers its bundled Linux fonts over the system's (`utils.py`, *Bundled fonts*); `font-hijacker.patch` keeps the bundle off only when the identity's platform is the host's. Web pages ask fonts by name and render; the browser's own pages ask for the system UI font and render scrambled glyphs. Tried on 2026-11-06 on Matthew's Mac: with a `macos` identity, `about:addons` reads correctly.

## Decisions

- **The host's system, not a choice.** `HOST_OS = {'darwin': 'macos', 'win32': 'windows'}.get(sys.platform, 'linux')`. A claim that matches the host also keeps the canvas real (`host_rendering.py`), so it is more believable than a foreign one.
- **The saved identity records its system.** `fingerprint.json` gains `os`; `saved_fingerprint` reuses a file only when its versions and its `os` match. A file with no `os` was made as Linux, so it is read as `linux`: a Linux computer keeps its identity, a Mac or Windows computer makes a new one once.

## Risks

- A site that tied a login to the old identity may ask for a sign-in once, on a Mac or Windows computer.
