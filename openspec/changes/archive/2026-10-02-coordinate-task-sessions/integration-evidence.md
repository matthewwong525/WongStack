# Disposable chat integration evidence

Task 4.2 passed on 2026-10-02, 19:26–19:34 UTC, with installed Paseo CLI 0.10.1. The production implementation was unchanged during this exercise; its earlier CI gate passed for `0cad70c` in run `37053586778`.

## Test scope and recipients

- Existing workspace: `wks_7ce09a61077aba38`, canonical checkout `/root/.paseo/worktrees/2b9tffs3/warm-kangaroo`.
- Every operation used explicit daemon home `/root/.paseo`; no host route was set. Calls were bounded foreground operations.
- A: `652f0f1d-5bbe-4f4b-a4c0-5a0c97d93406`, title `Coordination fixture A`; owned an imaginary subtotal contract.
- B: `cd56edc3-75ee-41b5-9bb4-7b60686a5ad8`, title `Coordination fixture B`; owned its imaginary display.
- Both used the parent's `codex` provider, `gpt-6.1-sol` model, `high` thinking, and `full-access` mode in the existing workspace. Each test brief authorized only its own existing scratch plan and messages to its exact paired fixture ID. Neither had publishing permission.

## Observed exchange

1. A ran the production `other-work.mjs` helper with its own session ID and explicit home. It found B's exact ID, fresh title and `idle` status in the shared checkout and excluded itself. A read B's scratch plan before contacting it. B separately verified A with the helper's chat filtering and canonical checkout check; it did not run the helper's git discovery a second time.
2. A proposed: A owns the subtotal contract; B owns the display; hypothetical contract publication precedes dependent display publication. B recorded receipt with **no accepted agreement**.
3. B asked: “Is subtotal a decimal in currency units or integer minor units, and what example should the display expect?” A recorded receipt without treating the question as agreement.
4. A answered: decimal currency units, example `12.50`; the responsibility split and publication order remained pending B's actual acceptance.
5. B explicitly accepted the split and hypothetical order, stating that B would confirm A's publication and incorporate it before dependent publishing under B's own gate and approval. A recorded that actual acceptance, with no acknowledgement loop.

Immediately before all four peer sends, each sender inspected the exact paired Id and required `Archived=false`, `Status=idle`, `PendingPermissions=[]`. The controller also verified those fields before its four phase messages. Both fixtures returned idle between phases; dispatch returned `sent`, and agreement was recorded only after the actual acceptance. No busy recipient was interrupted, no unrelated chat received a task, and no stop/cancel operation was used.

## Existing plan excerpts at completion

A's own `.scratch/coordinate-task-sessions-live-20261002/A-plan.md`:

> Accepted agreement: A owns the decimal currency-unit `subtotal` contract; B owns the display. Hypothetically, B confirms A publication and incorporates it before dependent publishing under B's own gate and approval.
>
> Own publishing permission: none.

A independently completed ordinary sample `12.50` and boundary sample `0.00` before and after the exchange.

B's own `.scratch/coordinate-task-sessions-live-20261002/B-plan.md`:

> Accepted agreement: A owns the decimal currency-unit `subtotal` contract; B owns the display. Hypothetical A publication precedes dependent B publication.
>
> Neither task has publishing permission. Nothing is published in this test.

B independently completed label `Order subtotal`, placeholder layout `Order subtotal: <value>`, and final sample `Order subtotal: 12.50`.

Final plan SHA-256: A `7c7ab349d27da26226127acecabb358a95d3903b80c161f446decdfdfc1bc001`; B `0eebfc11efeede34cf48c79bf8864f5f18b775fe7a792558c095c2a4d2f36f2d`. These excerpts were captured after both owners finished, before fixture cleanup. The archived Paseo conversations retain the proposal, context request, owner answer, acceptance and tool activity under the exact IDs above; inspect them with `paseo logs <id> --home /root/.paseo`.

## Cleanup and limits

Both were freshly inspected idle with no permissions before archiving only those IDs. A archived at `19:33:33.098Z`; B at `19:33:56.751Z`. Post-archive inspection confirmed each exact ID had `Archived=true`, `Status=closed`, and no permissions. Removed only the test's scratch directory after retaining these excerpts. No workspace, branch, OpenSpec change, production file or publishing action was created by either fixture.

B's first test-only path check encountered an absent unrelated path; it corrected that scratch invocation and completed verification. No product fixture or implementation fix was needed. This controlled idle test validates discovery, targeted context exchange, independent ownership and approval preservation. It does not validate busy delivery or publish a real prerequisite; inspection remains non-atomic as the design states. No queue, watcher or persistent coordination registry was added.
