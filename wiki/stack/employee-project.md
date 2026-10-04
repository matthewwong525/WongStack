# Employee assistant connection

Sign in to the business app, copy its setup prompt and paste it into your assistant. The prompt connects company API work allowed by your current app permissions, using your own business login on that computer. Repository access and memory setup remain separate.

## Get the reviewed bootstrap

The app's prompt names an exact public WongStack Source commit and SHA-256 digest for `scripts/employee-bootstrap.mjs`, distributed at `https://raw.githubusercontent.com/matthewwong525/WongStack/<full-commit>/scripts/employee-bootstrap.mjs`. A mutable branch URL, business-server script or invented release asset is unsuitable. Missing release pins show setup unavailable.

Fetch the exact URL without credentials and refuse redirects. Verify its complete SHA-256 digest before executing anything. Save it as `bootstrap.mjs` in an OS-user-private directory outside every checkout (directory 0700, file 0600). The canonical business origin must be HTTPS without a path, query, fragment or credentials. Node and cloudflared are the only runtime tools; install missing tools from their official distributions. Nobody needs an employer's key.

After verifying the artifact, use one private directory for this business:

```bash
node "$PRIVATE_CONNECTION/bootstrap.mjs" login --state "$PRIVATE_CONNECTION" --origin https://business.example.com
node "$PRIVATE_CONNECTION/bootstrap.mjs" status --state "$PRIVATE_CONNECTION"
node "$PRIVATE_CONNECTION/bootstrap.mjs" list --state "$PRIVATE_CONNECTION" --q orders
node "$PRIVATE_CONNECTION/bootstrap.mjs" describe orders.lookup --state "$PRIVATE_CONNECTION"
node "$PRIVATE_CONNECTION/bootstrap.mjs" call orders.lookup --state "$PRIVATE_CONNECTION" --file - <<'JSON'
{"reference":"synthetic-order"}
JSON
```

`PRIVATE_CONNECTION` is the nonsecret path chosen for this business. Login uses your own browser approval. A different computer or expired session may require approval again. On a headless computer, only a validated Cloudflare Access CLI link for this business is shown. Raw login output and sessions remain private. Redirected credential requests are refused. Changing the signed-in person requires a separate private connection.

`status` reads authenticated API permission and current app assignments, including zero assigned apps; it proves no repository or memory connection. Every signed-in person gets it, before and after [Access permissions start](employee-access.md#the-first-open). Removed employees are denied. Discovery describes only permitted live actions; calls consult the current selected contract and execute once. Check uncertain write outcomes before repeating them.

The helper needs no checkout, memory module, package installation or repository credential. Existing files and memory settings remain untouched. Installed [company calls](company-api.md#connect-and-call) use the same transport with explicit `--state`; installed memory reads keep their existing independent authority.

## Repository access stays manual

The employer grants or withdraws repository access through its provider, and employees authenticate there separately. App login issues no repository credential or invitation and changes no personal GitHub login. Ordinary `/continue`, `/save` and `/ship` keep their existing provider authentication and delivery gates. Downloaded copies remain outside app removal.

## Memory keeps its own setup

Company login grants no new memory permission or machine enrollment. Preserve already installed memory and its target. A fresh computer reports independent operator setup required without blocking otherwise authorized company APIs. Follow [memory access](../development/memory-key.md) through the trusted owner when needed.

## Publish checked artifact pins

[The committed release record](../../app/worker/employee-access/bootstrap-release.json) carries `version: 1`, a full public Source `commit` and complete `sha256`; blank pins deliberately leave prompt copying unavailable. The final source checkpoint may create a complete source commit, pin its artifact bytes in a subsequent commit, and push once. At the final checked head, distribution tests prove the pinned commit is an ancestor, its artifact digest matches and its bytes equal the bootstrap under test. Confirm the exact public raw URL after those checks pass. Commit existence alone proves no readiness.

If bootstrap bytes change afterward, establish a new immutable source commit and matching digest before claiming the copied prompt ready. Never change existing pins to a mutable URL. Customized installs retain their branding, login, app routes, dirty local work and separate memory.

Part of the [Cloudflare stack](README.md).
