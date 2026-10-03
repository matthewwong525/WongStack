# Manage Cloudflare with cf

Use [Cloudflare's cf CLI](https://developers.cloudflare.com/cf/) to inspect your account and carry out authorized, one-off resource work. It covers resources such as D1, R2, Workers, and Access alongside the existing [Cloudflare stack](README.md).

## Keep setup and publishing in their existing flow

Account management uses cf; app publishing follows the [change loop](../development/the-change-loop.md) and [deploy and data pipeline](d1-pipeline.md). Publishing Worker code, changing runtime secrets or triggers, and applying database schema changes belong to their existing reviewed workflows. The [staging secrets page](staging-bindings.md#one-declared-list-of-secrets-two-workers) owns secret updates, and [database recovery](d1-recovery.md) owns repairs.

Keep automated setup in the [provisioning runbook](https://github.com/matthewwong525/WongStack/blob/main/.agents/skills/wong-setup/references/cloudflare.md) and its [provisioning script](https://github.com/matthewwong525/WongStack/blob/main/.agents/skills/wong-setup/scripts/provision.mjs). These already handle resource reuse, login protection, propagation waits, credentials, and recovery. Do not replace them or the pipeline scripts with cf calls.

This adoption does not run `cf init`, `cf migrate`, `cf dev`, `cf build`, or `cf deploy`. Cloudflare [supports resource commands beside Wrangler projects](https://developers.cloudflare.com/cf/#cf-and-wrangler), but its project commands need a separate migration. Running them against a Wrangler project can generate configuration that ignores the existing settings.

## Add the tool when needed

Check `cf --version` and confirm it is Cloudflare's CLI. If another product owns `cf`, use the equivalent `cloudflare` executable for every command below. The tool is in beta: check the installed version's help and [current installation requirements](https://developers.cloudflare.com/cf/get-started/) before using it. The documented Node minimum is 22.18.

When account work needs it and it is absent, follow [point-of-need installation](../development/required-tools.md#runtimes-install-at-the-point-of-need). Honor installation authorization already given in the conversation; an authorized install needs no second question.

```bash
npm install --global cf
cf --version
```

If that would need a password, use a user-local npm prefix and ensure its bin directory is on PATH:

```bash
npm install --global --prefix "$HOME/.local" cf
export PATH="$HOME/.local/bin:$PATH"
cf --version
```

This is an optional tool on the assistant's computer. Keep it outside the app's package manifest and lockfile. It adds no fresh-install requirement, server-installer step, or dependency for ordinary verbs and automated provisioning.

## Select the existing authorized account

Use the existing `CLOUDFLARE_API_TOKEN` and explicitly select `CLOUDFLARE_ACCOUNT_ID`; [Cloudflare credentials](cloudflare-credentials.md#store-it) owns their names and storage. Follow the [secrets convention](../development/secrets.md#the-two-files) to resolve the primary worktree's ignored `.env` and load those values into the command's environment without printing them. Keep the selected account within the task's authorized scope.

The [CLI's credential and account rules](https://developers.cloudflare.com/cf/get-started/#credential-order) give environment values priority over saved profiles and cached account choices. API commands can read `.env` in their current directory; running inside `app/` does not load the repo-root file. Explicitly loaded environment values avoid that ambiguity. An unrelated saved login, cached account, or [runtime `.dev.vars`](staging-bindings.md#env-and-devvars-are-not-interchangeable) supplies no account authorization.

A hosted or scoped workspace stays within its supplied access. Missing account-admin credentials do not call for customer sign-in or a customer's account token. When authorized account work lacks a credential or permission, use the existing [credentials procedure](cloudflare-credentials.md) and [private key link](../development/secrets.md#receive-a-key-through-a-private-link). Adopting cf grants no wider permission on its own.

Never put tokens in command arguments, app runtime secrets, plan artifacts, or reports. Commands that create credentials can return their secret values: capture that output privately and report only the nonsecret fields needed to explain the result.

## Find and inspect the command

Start with the task, then inspect the matching command's API schema and help. Cloudflare's [coding-agent guide](https://developers.cloudflare.com/cf/agents/) documents this sequence:

```bash
cf cli search "create D1 database"
cf schema d1 create
cf d1 create --help
cf d1 create --name example-database --dry-run
```

Search runs locally. Schema inspection covers generated API commands; command help describes the installed version's arguments and options. A supported `--dry-run` prints the request without sending it and needs no credentials. The example above previews a request; it does not create a database. Use the command returned for your task and confirm its options instead of copying guessed flags. Nested fields or incomplete schemas may need `--body`; check the corresponding [Cloudflare API reference](https://developers.cloudflare.com/api/) and the command's help for its shape.

Run the inspected command only within the existing [task authorization](../development/the-change-loop.md#just-ask) and [credential boundaries](cloudflare-credentials.md#the-widen-is-pre-authorized). Check noninteractive delete output: Cloudflare documents that an aborted delete can exit zero. Confirm the result with a read; do not treat exit status as proof, or add `--force` without checking that command's meaning.

## Read and report the result

API results usually reach standard output as JSON; progress and errors use standard error. Read JSON directly or use Node's built-in JSON parser, with no jq dependency. For example, to summarize the credential-free search:

```bash
cf cli search "create D1 database" | node --input-type=module -e 'let input = ""; for await (const part of process.stdin) input += part; console.log(JSON.parse(input).map(item => item.command).join("\n"));'
```

Lists return one page. Check each command's help for its paging options and fetch the remaining pages before claiming a complete inventory. Some successful changes return no data, while raw R2 objects or generated images return bytes rather than JSON; save those privately to a file when needed. Report the account, relevant nonsecret resource fields, and what was confirmed in plain words.

If the installed version lacks the command or option, consult its help and the [Wrangler command mapping](https://developers.cloudflare.com/cf/wrangler/reference/). Use the existing runbook or documented API route within the same authorized scope. A missing beta feature is no reason to migrate the app or change its publishing flow.
