# Acceptance after the first save

Done on 2026-10-05 and 2026-10-06, from this branch's code, on the owner's paid Cloudflare account. [The trial record](trial.md) holds the numbers; this page says what each step of task 5.7 showed.

| Step | Outcome |
|---|---|
| A fixed-steps request | Given `/routine every night at 2am: copy yesterday's orders into the archive table`, a fresh assistant reading only the skill said it is a script, made no routine, and went to plan a timed job in the app. Given `find new articles about our competitors`, it chose a routine. It ran no command in either case. |
| A first routine installs the runner | With nothing installed, `create --dry-run` showed what would be added, the cost, and three models. `create` installed everything in 34 seconds and stopped for a model; after `model`, `create` made the routine. |
| A run and its result | Seven runs ended `ok`, each with its start-up and run time in the list and its output in `logs`. One started from the clock, 5 seconds after its set time. |
| The run's saved branch | Each run that changed a file pushed its own branch to the project in Cloudflare Artifacts, with the maker as author, and `main` did not move. |
| The run's memory note | A run holding the key made for runs stored one thread, and it showed in a search from the owner's own checkout. The same key was shown none of the owner's private facts. |
| Delete and tear down | The routines were deleted, and every piece was removed by the page's steps and read back as gone, twice. The runs' memory key shows as revoked. |

## Not shown

- **A run that saves to GitHub.** Task 5.2 holds it open: it waits for a GitHub token that can write.
- **A working pasted model key.** Dropped by the person's choice on 2026-10-06.
