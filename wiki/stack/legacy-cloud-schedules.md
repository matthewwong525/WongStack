# Legacy cloud schedules

An installed cloud runner keeps serving its existing jobs after a WongStack update removes the runner's local source. [Host schedules](host-schedules.md) own new work. The legacy path only lists, inspects, pauses, resumes, removes selected jobs, and carries out requested teardown; it cannot install or redeploy a runner or select a new cloud model.

## Inspect and manage

Use the [schedule skill's legacy path](../../.agents/skills/schedule/SKILL.md) with the existing `components.routines` install record, Worker endpoint, and `WONG_ROUTINES_KEY`. The key remains in the ignored `.env`; neither records nor output contain its value. An unavailable endpoint changes nothing. Inspect an uncertain mutation by stable identity before retrying. Keeping local runner files out of new payloads does not remove the deployed Worker or its stored secrets.

## Move one job

Move a job only when requested. Inspect its identity, prompt, timing, recent result, and permitted actions first. Adopt a host job by verified identity, or prepare a paused replacement with published instructions and future-session access. Pause the original and verify that state before arming the replacement. Read back its binding and time; keep a failed handoff recoverable, with neither side doing duplicate outreach. Other jobs remain untouched.

Older prompts can invoke `/routine`, which has retired. Identify those during migration and repair them explicitly to use the published schedule-run instructions. The compatible migration/run path resolves older improve and dream prompts to the current skills; it does not silently rewrite deployed prompts. Removing the old resources is a separate choice after the new job is verified.

## Renew a key

Preserve existing model and project secrets while old jobs still use them. New host schedules use their host's login and connections. A revoked legacy credential needs an explicit repair through the service's existing management tools; this payload cannot bootstrap or redeploy the old runner. Use [the private key link](../development/secrets.md#receive-a-key-through-a-private-link) for replacement values, never chat. Stop or migrate jobs that can no longer run; do not claim a local source update repaired their deployed runner.

## The permissions it adds

Earlier runner setup could add container and billing access plus AI Gateway and Workers AI permissions to the owner's Cloudflare token. Updating does not widen or narrow that token. After explicitly removing the runner, review [narrowing back](cloudflare-credentials.md#narrowing-back); remove only permissions no remaining resource needs.

## Tear it down

Teardown is destructive. First list the exact installed resources and ask for confirmation through [the stack's teardown](getting-started.md#teardown). Do not infer permission to remove them from an update or migration. With that request and the existing account token, remove only the selected installation's resources, then read each back as gone:

1. The Worker: `DELETE /accounts/{account_id}/workers/scripts/<base>-routines?force=true`. Its stored jobs and keys go with it.
2. Its separately listed container application and Workflow: `DELETE /accounts/{account_id}/containers/applications/<id>` for the matching application, and `DELETE /accounts/{account_id}/workflows/<base>-routines`.
3. Its AI Gateway and model-only token: `DELETE /accounts/{account_id}/ai-gateway/gateways/<base>-routines`, and `DELETE /accounts/{account_id}/tokens/<id>` for the verified token named `<base>-routines-ai`.
4. Its recorded run identity's memory credential, following [memory-key revocation](../development/memory-key.md#add-or-remove-a-teammate). The id is in `components.routines.memoryMachine`; deleting the Worker alone does not revoke it.
5. The selected install's local `WONG_ROUTINES_KEY` and `WONG_ROUTINE_*` declarations and values, `components.routines`, and any old generated runner config. Preserve them while cleanup remains uncertain.
6. At their services, the dedicated legacy model key and GitHub token, after checking no other job uses them. Follow [token website steps](../development/secrets.md#api-token-website-steps) when a person must act.

Skip and name anything whose identity does not match. Keep cleanup blockers visible after partial removal; never recreate resources to hide a failure. Existing host tasks are unaffected.

Back to [host schedules](host-schedules.md) and [the Cloudflare stack](README.md).
