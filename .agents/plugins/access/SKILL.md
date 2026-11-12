---
name: access
description: See who can sign in and what each person may use; add, change or remove a person.
user-invocable: true
---

# /access

You read and change the app's people as the person in the chat. The app decides what they may do: only the owner or an Admin can change people. The [Access page](https://github.com/matthewwong525/WongStack/blob/main/wiki/stack/employee-access.md) owns the rules.

From the repo root, call the app with this computer's sign-in. The app's address is `app` in `.agents/access/slots.json`, else the one a WongStack install records:

```bash
node --input-type=module -e '
import { appOrigin } from "./.claude/skills/access/scripts/lib/client.mjs";
import { headers, signInHelp } from "./.claude/skills/access/signin/computer.mjs";
const app = appOrigin(".");
const signed = headers(app);
if (!signed) throw new Error(`Not signed in: ${signInHelp(app)}`);
const [, , path, body] = process.argv;
const init = { headers: { ...signed, "content-type": "application/json", ...(body && { origin: app }) }, redirect: "error" };
const answer = await fetch(new URL(`/api/access/${path}`, app), body ? { ...init, method: "POST", body } : init);
console.log(answer.status, await answer.text());' <path> [json]
```

| You want | Path | Body |
|---|---|---|
| Who has what | `status` | none |
| Add or change a person | `people` | `{"email":"a@shop.com","removed":false,"apps":{"<app>":true},"keys":{"<key>":"read"}}` |
| Give a person a role | `people` | `{"email":"a@shop.com","removed":false,"role":"<role id>"}` |
| Remove a person | `people` | `{"email":"a@shop.com","removed":true}` |
| Make or change a role | `roles` | `{"name":"Sales","apps":{…},"keys":{…}}`, with `id` to change one |

1. Read `status` first. Name each person, their role, apps and key levels in plain words, never as JSON.
2. Before each save, say what changes, for whom, and ask. Save only on a yes, one change at a time.
3. After a save, read `status` again and say what is now true.
4. A refusal is `{"code": "<why>"}`: tell the person in plain words. `owner_required`: they are not the owner or an Admin; `owner_setup_required`: the app names no owner, or the sign-in did not reach it.
5. With no `.agents/access/slots.json`, Access is not set up: offer [the setup guide](references/setup.md).
