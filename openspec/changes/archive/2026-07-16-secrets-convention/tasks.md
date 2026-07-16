## 1. The convention

- [x] 1.1 Add a root `.env.example` with documented placeholder variables (inline comment per var); assert no platform names (Cloudflare/wrangler/Workers Builds)
- [x] 1.2 Add real-secret filenames (`.env`, `.env.local`, `.dev.vars`) to `.gitignore`
- [x] 1.3 Author `docs/development/secrets.md` per the progressive-disclosure rulebook; link it from `docs/development/README.md`

## 2. Installer + release

- [x] 2.1 Have `install-wong-stack` offer to seed the `.env.example` + `.gitignore` entries into target repos (opt-in, not forced; the `secrets.md` page rides along with `docs/`)
- [x] 2.2 Add a `CHANGELOG.md` entry and bump `VERSION` `4.0.0 → 4.1.0`
- [x] 2.3 Verify: `.env.example` names no platform, docs link resolves, installer seeding is opt-in, no skill/loop behavior changed
