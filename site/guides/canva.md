---
title: Connect Canva
name: Canva
summary: Designs and brand templates
order: 6
minutes: 15
needs: A Canva account with two-step verification turned on. Node.js 22 or newer on your computer.
lastChecked: 2026-10-31
env: [CANVA_CLIENT_ID, CANVA_CLIENT_SECRET, CANVA_REFRESH_TOKEN]
---

## What you make

You make a Canva integration: a small app in Canva's developer portal. You sign in to it one time, and a script saves a *refresh token*. With it, your agent reads your designs, images, and brand templates.

Canva also has its own AI connector. If your AI agent can add a connector by its address, add `https://mcp.canva.com/mcp` and sign in to Canva. Then you need no key, and you can skip this guide.

## Steps

### 1. Make an integration

Go to [canva.com/developers/apps](https://www.canva.com/developers/apps) and sign in. Tap **Create an integration**. Choose **Public**: it works for your own account before Canva reviews it. Type a name, such as `AI assistant`, agree to the terms, and tap **Create integration**.

![Canva's developer portal, with the Create an integration button marked](/guides/canva/01.webp)

### 2. Choose what it can read

Open **Scopes**. Turn on **Read** for only what the job needs; read [Permissions to choose](#permissions-to-choose). To start, turn on `design:meta`, `asset`, and `brandtemplate:meta`, each with **Read** only.

![The integration's Scopes page, with Read turned on for design, asset, and brand template, and marked](/guides/canva/02.webp)

### 3. Add the sign-in address

Open **Authentication**. Under **Redirect URLs**, add this address exactly:

```text
http://127.0.0.1:3001/oauth/redirect
```

![The integration's Authentication page, with the redirect address typed and marked](/guides/canva/03.webp)

### 4. Copy the client ID and make a secret

Open **Configuration**. Under **Credentials**, copy the **Client ID**. Tap **Generate secret**, and copy the secret. Canva shows the secret one time only. Paste each one straight into your `.env` file, as *Save it* shows.

![Drawing of the integration's Configuration page: the Client ID box and the Generate secret button marked. The values are hidden.](/guides/canva/04.svg)

### 5. Sign in one time

Save this script as `canva-sign-in.mjs` in your project folder:

```js
// Run: node canva-sign-in.mjs — reads CANVA_CLIENT_ID and CANVA_CLIENT_SECRET from .env, then saves
// CANVA_REFRESH_TOKEN in .env. It never prints a token.
import { createHash, randomBytes } from "node:crypto";
import { readFileSync, writeFileSync } from "node:fs";
import { createServer } from "node:http";

const SCOPES = "design:meta:read asset:read brandtemplate:meta:read";
const REDIRECT = "http://127.0.0.1:3001/oauth/redirect";
const env = readFileSync(".env", "utf8");
const read = (name) => env.match(new RegExp(`^${name}=(.*)$`, "m"))?.[1].trim();
const basic = Buffer.from(`${read("CANVA_CLIENT_ID")}:${read("CANVA_CLIENT_SECRET")}`).toString("base64");
const verifier = randomBytes(48).toString("base64url");
const challenge = createHash("sha256").update(verifier).digest("base64url");
const state = randomBytes(16).toString("hex");

const listener = createServer(async (req, res) => {
  const url = new URL(req.url, REDIRECT);
  const code = url.searchParams.get("code");
  if (!code || url.searchParams.get("state") !== state) return res.end("Sign-in failed. Run the script again.");
  const answer = await fetch("https://api.canva.com/rest/v1/oauth/token", {
    method: "POST",
    headers: { Authorization: `Basic ${basic}` },
    body: new URLSearchParams({ grant_type: "authorization_code", code, code_verifier: verifier, redirect_uri: REDIRECT }),
  }).then((r) => r.json());
  if (answer.refresh_token) {
    const kept = env.replace(/^CANVA_REFRESH_TOKEN=.*$\n?/m, "").trimEnd();
    writeFileSync(".env", `${kept}\nCANVA_REFRESH_TOKEN=${answer.refresh_token}\n`);
    console.log("Saved CANVA_REFRESH_TOKEN in .env.");
    res.end("Done. You can close this tab.");
  } else {
    console.log("Canva sent no refresh token:", answer.error ?? answer.code ?? "unknown error");
    res.end("Sign-in failed. Look at the terminal.");
  }
  listener.close();
});

listener.listen(3001, "127.0.0.1", () => {
  const auth = new URL("https://www.canva.com/api/oauth/authorize");
  const params = {
    client_id: read("CANVA_CLIENT_ID"), redirect_uri: REDIRECT, response_type: "code", scope: SCOPES, state,
    code_challenge: challenge, code_challenge_method: "s256",
  };
  for (const [key, value] of Object.entries(params)) auth.searchParams.set(key, value);
  console.log(`Open this address in your browser, and sign in:\n${auth}`);
});
```

Run `node canva-sign-in.mjs` in a terminal, in your project folder. Open the address it prints. Canva asks if the app can read your account. Tap **Allow**. The terminal says `Saved CANVA_REFRESH_TOKEN in .env.`

![Drawing of Canva's permission screen: AI assistant asks to read your designs, with Allow marked](/guides/canva/05.svg)

## Permissions to choose

| Scope | What it lets the agent do |
|-|-|
| `design:meta:read` | List your designs and read their titles and thumbnails |
| `design:content:read` | Read what is inside a design, and export it |
| `asset:read` | Read your uploaded images and videos |
| `brandtemplate:meta:read` | List your brand templates |
| `design:content:write`, `asset:write` | Make designs and upload files. Add these only when a job needs them. |

If you change the scopes, change `SCOPES` in the script to match, and run it again.

## Save it

Add these lines to the `.env` file in your project folder. The sign-in script adds the third:

```bash
CANVA_CLIENT_ID=paste-the-client-id-here
CANVA_CLIENT_SECRET=paste-the-secret-here
CANVA_REFRESH_TOKEN=the-script-writes-this
```

Each refresh token works one time only. Each time your agent uses it, Canva sends a new one, and the agent must save it in `.env` in place of the old one. If it does not, the next sign-in fails, and you run `node canva-sign-in.mjs` again.

Make sure git ignores `.env`, and keep a copy in your password manager: [Keep your keys safe](/guides/keep-keys-safe).

## Check it works

Save this script as `canva-check.mjs` in your project folder:

```js
// Run: node canva-check.mjs — uses the refresh token, saves the new one in .env, and reads your Canva user.
import { readFileSync, writeFileSync } from "node:fs";

const env = readFileSync(".env", "utf8");
const read = (name) => env.match(new RegExp(`^${name}=(.*)$`, "m"))?.[1].trim();
const basic = Buffer.from(`${read("CANVA_CLIENT_ID")}:${read("CANVA_CLIENT_SECRET")}`).toString("base64");
const answer = await fetch("https://api.canva.com/rest/v1/oauth/token", {
  method: "POST",
  headers: { Authorization: `Basic ${basic}` },
  body: new URLSearchParams({ grant_type: "refresh_token", refresh_token: read("CANVA_REFRESH_TOKEN") }),
}).then((r) => r.json());
if (!answer.access_token) {
  console.log("No access:", answer.error ?? answer.code, "- run node canva-sign-in.mjs again.");
} else {
  const kept = env.replace(/^CANVA_REFRESH_TOKEN=.*$\n?/m, "").trimEnd();
  writeFileSync(".env", `${kept}\nCANVA_REFRESH_TOKEN=${answer.refresh_token}\n`);
  const me = await fetch("https://api.canva.com/rest/v1/users/me", {
    headers: { Authorization: `Bearer ${answer.access_token}` },
  }).then((r) => r.json());
  console.log(me.team_user ? "It works." : me);
}
```

Run `node canva-check.mjs` in a terminal, in your project folder. It works when it prints `It works.`

## If it leaks

**A refresh token:** run this in your project folder, while `.env` still holds the leaked token. The token stops working at once. Then run `node canva-sign-in.mjs` again.

```bash
set -a; . ./.env; set +a
curl -s -X POST https://api.canva.com/rest/v1/oauth/revoke \
  -u "$CANVA_CLIENT_ID:$CANVA_CLIENT_SECRET" -d token="$CANVA_REFRESH_TOKEN"
```

**The client secret:** open the integration at [canva.com/developers/apps](https://www.canva.com/developers/apps). Under **Configuration**, tap **Generate secret** to make a new one, and put it in `.env` in place of the old one. If you are not sure the old secret stopped working, delete the integration and make a new one with steps 1 to 5.

## Sources

- Canva: [Connect APIs](https://www.canva.dev/docs/connect/)
- Canva: [Creating integrations](https://www.canva.dev/docs/connect/creating-integrations/)
- Canva: [Authentication](https://www.canva.dev/docs/connect/authentication/)
- Canva: [Generate an access token](https://www.canva.dev/docs/connect/api-reference/authentication/generate-access-token/)
- Canva: [Get current user](https://www.canva.dev/docs/connect/api-reference/users/users-me/)
- Canva: [Revoke a token](https://www.canva.dev/docs/connect/api-reference/authentication/revoke-token/)
- Canva: [Set up the Canva AI Connector](https://www.canva.com/help/mcp-agent-setup/)
