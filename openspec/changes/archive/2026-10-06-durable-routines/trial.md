# Trial on a real Cloudflare account

Run on 2026-10-05 on the owner's account (Workers Paid), from a Linux server with no Docker. Everything was made under the throwaway name `wong-rt-trial` and is listed under [Clean-up](#clean-up).

## What was set up

- **A throwaway install:** a copy of this branch in a temp folder, with its own name and only the two Cloudflare keys in its `.env`. It held no memory key.
- **A throwaway project** in Cloudflare Artifacts, `wongstack/wong-rt-trial`: a README, `AGENTS.md`, `NOTES.md`, and one skill, `.agents/skills/tidy/`, whose `SKILL.md` runs a Node script, appends its line to `NOTES.md`, and pushes a branch.
- **The runner**, installed by `routine.mjs setup`.

## Results

| What | Result |
|---|---|
| First `setup` | Worked in 35 seconds. The token gave itself `AI Gateway Write`, `AI Gateway Run`, and `Workers AI Read`; it already held the other two. It made the Worker with its container and Workflow, the AI Gateway, the model-only key, and the routines key. |
| Second `setup` | Worked in 26 seconds, made nothing new, and kept the list and the model. |
| The public Sandbox image, no Docker | Deployed as `docker.io/cloudflare/sandbox:0.12.5`. |
| pi-ai inside the Worker | Worked. `model` listed the 54 models of Cloudflare's AI service. |
| The model-only key | Worked: a test request and whole runs went through the AI Gateway on it. |
| Pick a Workers AI model | `kimi-k2.7-code`, `glm-5.3`, and `glm-5.3-flash` were all accepted. GLM-5.3's test took from 2 to more than 20 seconds. |
| Pick a Claude model | Refused: `402 Insufficient wholesale credits. Please add additional credits on the AI Gateway Cloudflare dashboard`. The model in use was kept. |
| A run on a `/<name>` verb with a script | Status `ok`. Pi on Kimi K2.7 Code read the skill, ran its script, appended the line, and pushed `routine/tidy-run`. `main` did not move. The commit carries the maker's name and email. |
| A run that finds its own way | Status `ok` in 110 seconds, 7.7 of them start-up. Asked for the three top stories on Hacker News, Pi chose the site's public API over reading the page, appended the titles to `NOTES.md`, pushed `routine/news-run`, left `main` alone, and listed what it assumed, as the notice asks. |
| A run on GLM-5.3 | Status `ok` in 109 seconds, 8.1 of them start-up. It followed the same skill, and took the branch name from the words after `/tidy`. |
| Teardown by the page's steps | The first runner's Worker, container application, Workflow, AI Gateway, and model-only key were each deleted and read back as gone. |
| A first routine installs the runner by itself | With nothing installed, `create --dry-run` showed what would be added, the cost, and the three models. `create` then installed everything in 34 seconds and stopped with `needs: model` and the shortlist. After `model`, `create` made the routine. |
| The clock | A routine set for 21:04:00 UTC started by itself at 21:04:04.8, and its next run moved to the same time the next day. |
| Never twice at once | A `run` asked for while a run was going answered `started: false, reason: running`, and recorded one skipped start. |
| The runs' own memory key | `setup` issued a `member` key for a new machine id against the real memory store, sent it to the runner, and recorded the id; `member list` showed it as `member, routine runs, active`. A second `setup` issued nothing. |
| A run can't see private facts | On a full copy of this project, a run searched memory for `shadcn` and `routine`. It was shown 3 and 23 facts, all `thread` or `project`. The owner's `feedback` facts on the same words were not there. |
| A run leaves a note | The run stored one `thread` fact tagged `routine`, and it showed in a search from the owner's own checkout. The first try was lost: see below. These two runs took 6 and 11 minutes on GLM-5.3. |
| The Worker minting an Artifacts write key | Worked with `env.ARTIFACTS.get(repo).createToken('write', ttl)`. The key outlives the run by up to an hour. |
| No key in a URL, a log, or a stored step | The run's log and every stored Workflow step were searched for the Artifacts key, a Basic or Bearer header, the routines key, and the Cloudflare token. None was there. |
| An install whose project lives on GitHub, with no project key | `setup` installed a second runner, `wong-rt-gh-routines`, in 36 seconds and answered `needs: project-access`. `create` then stopped with the same answer and made no routine. |
| No computer left running | After both runs, Cloudflare's container list showed no active or assigned instance for either runner. |
| A run on the GitHub route | Status `ok` in 48 seconds, 7.7 of them start-up (clone 0.7, tools and `gh` 4.5). With a fine-grained token for the one repository, Pi on Kimi K2.7 Code followed the skill, pushed `routine/tidy-run`, and opened pull request #1 with `gh`. `main` did not move, the commit carries the maker's name, and the token was in no log and no stored step. |
| A GitHub token that can read but not save | The person gave a read-only token. `setup` asked GitHub, did not send the token to the runner, and answered `needs: project-access` with *The GitHub token can read this project but not save to it*. The runner's secrets stayed `AI_RUN_TOKEN` and `ROUTINES_KEY`. |
| A wrong pasted key, in Z.ai's shape | Recognised as Z.ai, refused by Z.ai with 401, and nothing was stored: the runner's secrets stayed `AI_RUN_TOKEN` and `ROUTINES_KEY`. The key's text was in no output. |
| A pasted key of no known shape | Stopped with `needs: provider` and the nine services to choose from. |
| No pasted key | Stopped with `needs: model-key`. |

## Start-up time (task 5.3)

The first run, on the Artifacts route:

| Piece | Seconds |
|---|---|
| Container start, and writing the four files | about 3.4 |
| Clone of the project (tiny, full history) | 0.9 |
| Tools, `npm ci` of 184 packages | 7.1 |
| **Start-up, to the assistant's first line** | **11.3** |
| The whole run | 51.7 |

The second run started in 7.7 seconds: clone 1.4, tools 4.4.

Start-up is under the 60-second limit, so no saved start was built.

## What the trial changed in the code

- **The model test waited 20 seconds, and GLM-5.3 can take longer.** It now waits 60.
- **A refusal with no HTTP status read as "could not be reached".** The status is now taken from the refusal's own words, so a 402 says the account has no credit.
- **The first call after `setup` got an empty 404.** A new key takes a few seconds to reach every Cloudflare location. The client now tries an empty 404 again, twice.
- **The notice said to leave a memory thread, but not how.** In a project with no memory skill, the assistant called its own chat the memory record. The notice now says to write the thread through the project's memory skill when it has one, and otherwise to end its reply with what is left. A first wording made a one-word task spend three minutes on that bookkeeping, so the notice also says to do neither when nothing is left; the same task then replied with its one word.
- **A note written the memory skill's usual way never left the container.** The skill's example names the chat session, a scheduled run has none, and the script then holds the fact for a next chat that never comes. The notice now says to leave the session out and to check the script answers `stored`.
- **A read-only GitHub token was accepted and would have failed at a run's first push.** `setup` now asks GitHub to store the empty file with the token, which only a token with write access may do, and keeps a token that can't.

## Not tried

- **A working pasted model key** (task 5.4): dropped on 2026-10-06. The person chose to rely on Cloudflare's own models, which every trial run used; the pasted-key path ships tested with a refused key and stand-ins.

Six key links were sent on 2026-10-05 and 2026-10-06. Four timed out unused, one was closed by another chat's link 33 seconds after it opened, and one took a read-only token. The person then gave that same token write access on GitHub, and the run above used it.

## Clean-up

Everything the trial made is deleted and read back as gone, through Cloudflare's API and GitHub's:

- Workers `wong-rt-trial-routines` and `wong-rt-gh-routines`, each with its container application and its Workflow.
- AI Gateways `wong-rt-trial-routines` and `wong-rt-gh-routines`.
- Account tokens `wong-rt-trial-routines-ai` and `wong-rt-gh-routines-ai`.
- Artifacts repositories `wongstack/wong-rt-trial` and `wongstack/wong-rt-mem`, with their tokens.
- The runs' memory key: `member list` shows its machine id as revoked. The test note it wrote is closed.
- GitHub repository `matthewwong525/wong-rt-trial`, with its test pull request.
- The temp folder on this server.

**Left on purpose:** the three permissions the owner's Cloudflare token gave itself, and the GitHub token the person saved as `WONG_ROUTINE_GITHUB_TOKEN`; the real install needs both.
