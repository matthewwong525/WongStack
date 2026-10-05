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
| The Worker minting an Artifacts write key | Worked with `env.ARTIFACTS.get(repo).createToken('write', ttl)`. The key outlives the run by up to an hour. |
| No key in a URL, a log, or a stored step | The run's log and every stored Workflow step were searched for the Artifacts key, a Basic or Bearer header, the routines key, and the Cloudflare token. None was there. |
| An install whose project lives on GitHub, with no project key | `setup` installed a second runner, `wong-rt-gh-routines`, in 36 seconds and answered `needs: project-access`. `create` then stopped with the same answer and made no routine. |
| No computer left running | After both runs, Cloudflare's container list showed no active or assigned instance for either runner. |
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

## Not done yet

- **The GitHub route** (the second half of task 5.2): a run that pushes to a GitHub repository needs a fine-grained token from the person, through the key link.
- **A real pasted model key** (task 5.4): needs a key from the person, through the key link.
- **A run that leaves a memory note:** the throwaway install held no memory key. Task 5.7 covers it.

## Clean-up

To delete, and to read back as gone through Cloudflare's API:

- Workers `wong-rt-trial-routines` and `wong-rt-gh-routines`, each with its container application and its Workflow.
- AI Gateways `wong-rt-trial-routines` and `wong-rt-gh-routines`.
- Account tokens `wong-rt-trial-routines-ai` and `wong-rt-gh-routines-ai`.
- Artifacts repository `wongstack/wong-rt-trial` and its tokens.
- GitHub repository `matthewwong525/wong-rt-trial`, private.
- The temp folder on this server.

The three permissions the owner's token gave itself stay; the real install needs them.
