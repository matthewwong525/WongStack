# Tasks

## 1. Setup skill

- [x] 1.1 In `.agents/skills/wong-setup/references/tools.md`, add a helpers step after the four tools: check `agent-browser` and `cloudflared`, include missing ones in the same one ask in plain words, install `agent-browser` (then `agent-browser install`, `--with-deps` on Linux only with passwordless `sudo`) and `cloudflared` by the routes `required-tools.md` owns, and on a helper failure say which one and continue
- [x] 1.2 Update the ask example in `tools.md` so it shows the helpers, and say a *no* still stops setup
- [x] 1.3 In `.agents/skills/wong-setup/references/failure-map.md`, add a row for a helper that fails to install: name it, say the agent offers it again at first need, continue

## 2. Server script

- [x] 2.1 In `server/setup.sh`, add a *Cloudflare Tunnel* step after *GitHub CLI* that adds Cloudflare's apt repository and installs `cloudflared`, per the design, and add `cloudflared` to the final check's tool list
- [x] 2.2 In `server/README.md`, add `cloudflared` to *The end state*'s tool list

## 3. Tests

- [x] 3.1 In `scripts/tests/server-setup.test.mjs`, add a test that the tools after `for tool in` in `setup.sh` equal the backticked tools in the first bullet of `server/README.md`'s *The end state*, naming any tool on one side only

## 4. Wiki and release

- [x] 4.1 In `wiki/development/required-tools.md`, say in the `agent-browser` and `cloudflared` rows, and in *Setup is the one skill that checks ahead*, that setup offers both up front and the [server setup script](https://github.com/matthewwong525/WongStack/blob/main/server/README.md) installs both, with first-need install as the fallback
- [x] 4.2 In `wiki/stack/getting-started.md`, add the browser and the tunnel tool to the tools setup may install
- [x] 4.3 Add a `## Next (minor) — Setup installs the agent's browser and tunnel tool up front` entry to `CHANGELOG.md`, with an **Updating.** note: nothing to do; an existing computer or server asks once, the first time it needs either tool
- [x] 4.4 Run `node scripts/check-payload-links.mjs`

## 5. Real runs

- [x] 5.1 With the person's OK (it makes a paid server), run `server/setup.sh` from this branch on a fresh smallest Ubuntu 24.04 server, per `server/README.md`'s *Test a change on a real server*: confirm it prints `workspace ready`, `cloudflared --version` works as the workspace user, and no `cloudflared` process runs afterward; then delete the server
- [x] 5.2 At `/save`, record open memory threads: the next real `/wong-setup` on a fresh computer installs both helpers in its one ask; the first wongstack-cloud server built after merge has `cloudflared`, and its first hand-over opens with no install question
