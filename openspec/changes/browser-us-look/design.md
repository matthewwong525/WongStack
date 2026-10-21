## Context

The host is a Hetzner server in Germany whose traffic exits Cloudflare WARP in Leipzig. `server.mjs` always starts the local forwarder and sets `PROXY_*` for camofox 1.18.1. With any proxy, camofox launches with `geoip: true` and `lib/browser-identity.js` drops `CAMOFOX_LOCALE`/`CAMOFOX_TIMEZONE` (`launchLocale` and `contextIdentityOptions` return nothing but geolocation for `hasProxy`), so the language, clock, and position follow the German exit. Without a proxy, camofox's own "direct identity" path applies both variables at launch and on every context.

## Goals / Non-Goals

**Goals:** a US look by default, switchable per computer, through camofox's supported variables; no camofox patch; the running browser untouched.

**Non-Goals:** changing the exit address, a city or position choice, other countries (the setting's shape leaves room).

## Decisions

- **Setting file.** `~/.wong-stack/camofox/look.json`, mode 0600, `{"look":"local"}` or `{"look":"us"}`; absent or unreadable means `us`, and only `local` restores today's forwarder. It sits beside `profiles/` so it survives updates and never enters a repo. Alternative rejected: a `.env` variable, because the browser is per computer while `.env` is per primary worktree, and the agent can set a file through one command.
- **Command.** `browse.mjs look` prints `BROWSE_LOOK=local|us`; `browse.mjs look us|local` saves it and prints `BROWSE_LOOK=<value>`, plus `BROWSE_LOOK_APPLIES=next-start` when a server is live. Anything else is a usage error. It never stops the server.
- **Start.** `spawnServer` reads the look. For `us`, `serverEnv` adds `CAMOFOX_LOCALE=en-US`, `CAMOFOX_TIMEZONE=America/New_York` and `BROWSE_LOOK=us`; `server.mjs` sees `BROWSE_LOOK=us`, strips every `PROXY_*` variable, and imports camofox with no forwarder. `server.json` records `proxy: 'none', look: 'us'` instead of `proxy: 'local'`. For `local`, both variables are removed from the env so a shell's stray values can't half-apply.
- **Why no forwarder for `us`.** Keeping it would make camofox ignore the variables. Patching camofox or rewriting its launch options through the `browser:launching` plugin hook was rejected: Matthew prefers leaving camofox's code alone, and the hook would rewrite camoufox's internal fingerprint config, which breaks silently on a bump.
- **`status`** prints the saved look and, for a live server, the look it started with, so the agent can tell when a restart is pending.

## Risks / Trade-offs

- **Mismatch signal.** A German address with a US clock and language is a pattern some bot checks score. → The person chose it knowing this; the wiki says to switch back with `look local` if a site starts refusing that let the browser in before.
- **Forwarder benefit lost by default.** The 2026-10-09 UPS test loaded through the forwarder, likely because its identity matched the exit; untested. → `look local` brings it back for a site that needs it, and the wiki says so.
- **Address-based language.** GoDaddy and similar sites may still show German by address. → The wiki names it; most such sites offer a language switch that the saved profile remembers.

## Migration Plan

No migration: no file means `us`, so every install, this one included, looks American from its next start; a running browser is left alone. Rollback is `browse.mjs look local` and a restart.
