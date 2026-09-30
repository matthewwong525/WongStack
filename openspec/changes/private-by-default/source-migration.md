# Source workspace migration evidence

## Reviewed ownership

The live account inventory on 2026-09-30 identified this repo's existing test application, `WongStack staging (Access runbook verification)`, ID `10a98858-5fe3-4650-a57f-a02786a1e851`. Memory fact 21 records its creation for the source's Access runbook verification on 2026-08-02. Its only destination was `wongstack-staging.ithinkwong.com`; its app-local policies allowed the two maintainers and the dedicated verification service token. No other source-host overlap was found.

## Protection migrated before content deployment

Expanded that application in place, keeping its ID, audience, both allowed human emails, and machine policy. Renamed it to the shared provisioner's owned application name, attached the actual `wongstack` and `wongstack-staging` Worker IDs, and added the production default-address login anchor. Production's Worker and anchor have only the `/_memory/*` public override; staging has none. The application's and human policy's new default are both `720h`. The reviewed old `24h` was the runbook fixture's previous default, rather than a requested custom override.

Provider readback confirmed the unchanged audience and complete new destinations. The private shared Git provisioning state records these owned identifiers for the provisioner's next run. No application, Worker, domain, policy, or service token was deleted. No app content was uploaded by this migration.

Cloudflare reordered destination and override object keys in its response. This exposed a false failure in stringified-object comparison; semantic comparison is required, while retaining complete destination validation.

## Initial checks

Anonymous requests to the production default address, staging default address, and existing staging custom domain each returned `302` to the existing Zero Trust organization. Production `/_memory/read` without a key returned `401`; the bare `/_memory` and lookalike `/_memoryx/read` remained behind Access (`302`). A real memory digest succeeded through the existing production memory Worker and admin key after migration.

The shared provisioner's live rerun created a dedicated verification service token and saved its pair in the ignored primary and branch `.env` files, each mode 0600. Machine requests to all three addresses returned `200`. The selected account's new `wongstack-deploy` token went directly to GitHub's sealed secret store. A later idempotent rerun added only the account-scoped `Access: Apps and Policies Read` group to that CI token without rolling its value or rewriting the GitHub secret.

A fresh browser profile, without service headers, completed email PIN login using the dedicated `wongstack-cloud` walk inbox. Production, staging, and the staging custom domain rendered. Their signed app cookies each have `exp - iat = 720h`, the expected workspace audience, and the test email. The session is saved outside git with mode 0600; the browser's initial state-save command timed out although it wrote the file, and a completed retry plus private-file inspection verified the save. The organization cookie has a different audience, as expected.

These checks are preparation, not completion of tasks 6.1 or 6.4. Actual guarded app deployment, existing/fresh previews, and coordinated cloud membership verification remain pending. The dedicated test email is temporary and must be removed after those checks, preserving both maintainers.

## Live deployment-check scope

A temporary token with the exact current CI token's policies passed `checkPrivateAccess` for both production and staging. Its groups were `Workers Scripts Write`, `D1 Write`, `Workers R2 Storage Write`, `Account Settings Read`, and account-scoped `Access: Apps and Policies Read`. The check read actual Worker IDs, secret names, default subdomain, application/destinations and policies, and application precedence; it published nothing. Neither organization nor identity-provider API permission was needed.

An unchanged-content Access human-policy write using that CI credential returned `403`, proving the new read scope did not authorize policy writes. The temporary token was revoked afterward. Source-owned identifiers, machine credentials, team permissions, and app/policy session durations remained unchanged on the provisioner's rerun.
