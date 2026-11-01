---
title: Connect Google
name: Google
summary: Gmail, Drive, Sheets, and Calendar
order: 5
minutes: 20
needs: A Google account. For the company path, you also need to be a Google Workspace super admin.
lastChecked: 2026-10-31
env: [GOOGLE_SERVICE_ACCOUNT_JSON, GOOGLE_IMPERSONATE_EMAIL, GOOGLE_CLIENT_ID, GOOGLE_CLIENT_SECRET, GOOGLE_REFRESH_TOKEN]
---

## What you make

Google has two paths. Choose the one that fits your account:

- **Google Workspace** (an email at your own company name, such as `you@yourshop.com`): you make a *service account*. It is a robot user that reads the mail and files of the people you choose, with read-only access. A Workspace super admin must allow it.
- **Personal Gmail** (an address that ends in `@gmail.com`): you make a small sign-in app. You sign in to it one time, and a script saves a *refresh token* that reads your own mail and files.

Both paths start with a Google Cloud project. A project is a free folder that holds the settings.

## Steps: Google Workspace

### 1. Make a project

Go to [console.cloud.google.com/projectcreate](https://console.cloud.google.com/projectcreate) and sign in. Type a project name, such as `ai-assistant`. Under **Parent resource**, tap **Browse** and choose your company. Tap **Create**.

![The New Project form in Google Cloud, with the project name and the Create button marked](/guides/google/01.webp)

### 2. Turn on the APIs

An API is the door a program uses to read a Google app. Turn on one door for each app the agent will read. Open each link, check that your new project shows at the top, and tap **Enable**:

- [Gmail API](https://console.cloud.google.com/apis/library/gmail.googleapis.com)
- [Google Drive API](https://console.cloud.google.com/apis/library/drive.googleapis.com)
- [Google Sheets API](https://console.cloud.google.com/apis/library/sheets.googleapis.com)
- [Google Calendar API](https://console.cloud.google.com/apis/library/calendar-json.googleapis.com)

![The Google Sheets API page, with the Enable button marked](/guides/google/02.webp)

### 3. Make a service account

Go to [console.cloud.google.com/iam-admin/serviceaccounts/create](https://console.cloud.google.com/iam-admin/serviceaccounts/create). Type a name, such as `ai-assistant`. Tap **Create and continue**. Skip the two optional parts, and tap **Done**. Do not give it a role: it reads mail and files through step 6, not through a role.

![The Create service account form with the name ai-assistant typed, and Create and continue marked](/guides/google/03.webp)

### 4. Make a JSON key

In the list of service accounts, tap your new one. Open the **Keys** tab. Tap **Add key**, then **Create new key**. Choose **JSON** and tap **Create**. Your browser downloads a file. The file is the key.

If Google says key creation is blocked, your company turned it off. A Workspace admin can allow it for this one project: in Google Cloud, open **IAM & Admin**, then **Organization Policies**, and find `iam.disableServiceAccountKeyCreation`.

Save the key in your `.env` file on one line. Open a terminal in your project folder, and run this command. Put the path of the downloaded file at the end, in place of `path/to/downloaded-key.json`. The command never prints the key:

```bash
node -e 'const fs = require("node:fs"); const key = JSON.stringify(JSON.parse(fs.readFileSync(process.argv[1], "utf8"))); const env = fs.existsSync(".env") ? fs.readFileSync(".env", "utf8").replace(/^GOOGLE_SERVICE_ACCOUNT_JSON=.*$\n?/m, "").trimEnd() : ""; fs.writeFileSync(".env", `${env}\nGOOGLE_SERVICE_ACCOUNT_JSON=\x27${key}\x27\n`.trimStart()); console.log("Saved GOOGLE_SERVICE_ACCOUNT_JSON in .env.")' path/to/downloaded-key.json
```

When it says `Saved GOOGLE_SERVICE_ACCOUNT_JSON in .env.`, delete the downloaded file, and empty the bin. A key file left in Downloads is a second copy that can leak.

![Drawing of the Create private key window: JSON is chosen, and Create is marked](/guides/google/04.svg)

### 5. Copy the Client ID

Open the service account's **Details** tab. Copy the **Unique ID**. It is a long number. Google also calls it the *Client ID*. It is not secret.

![Drawing of the service account's Details tab, with the Unique ID box marked](/guides/google/05.svg)

### 6. Allow it in the Admin console

A super admin does this step. Go to [admin.google.com](https://admin.google.com), then **Security**, then **Access and data control**, then **API controls**. Tap **Manage Domain Wide Delegation**, then **Add new**.

Paste the Client ID. Under **OAuth scopes**, paste the read-only scopes from [Permissions to choose](#permissions-to-choose), with commas between them. Tap **Authorize**. It can take up to 24 hours to start working.

![Drawing of the Add a new client ID window: the Client ID and the read-only scopes typed, and Authorize marked](/guides/google/06.svg)

## Steps: personal Gmail

### 1. Make a project

Go to [console.cloud.google.com/projectcreate](https://console.cloud.google.com/projectcreate) and sign in. Type a project name, such as `ai-assistant`. Tap **Create**.

![The New Project form in Google Cloud, with the project name and the Create button marked](/guides/google/01.webp)

### 2. Turn on the APIs

Open each link, check that your new project shows at the top, and tap **Enable**:

- [Gmail API](https://console.cloud.google.com/apis/library/gmail.googleapis.com)
- [Google Drive API](https://console.cloud.google.com/apis/library/drive.googleapis.com)
- [Google Sheets API](https://console.cloud.google.com/apis/library/sheets.googleapis.com)
- [Google Calendar API](https://console.cloud.google.com/apis/library/calendar-json.googleapis.com)

![The Google Sheets API page, with the Enable button marked](/guides/google/02.webp)

### 3. Start the sign-in setup

Go to [console.cloud.google.com/auth/branding](https://console.cloud.google.com/auth/branding). Tap **Get started**. Under **App information**, type an app name, such as `AI assistant`, choose your email, and tap **Next**.

![The Google Auth Platform page, with the Get started button marked](/guides/google/07.webp)

### 4. Choose External, then publish

Under **Audience**, choose **External** and tap **Next**. Type your email under **Contact information**, tap **Next**, agree to the policy, and tap **Create**.

Then open **Audience** in the menu on the left, and tap **Publish app**. If you skip this, Google stops your sign-in after 7 days.

![The Audience step of the setup, with External chosen and marked](/guides/google/08.webp)

### 5. Make a desktop client

Open **Clients** in the menu on the left, and tap **Create client**. Under **Application type**, choose **Desktop app**. Type a name, such as `AI assistant`, and tap **Create**.

![The Create OAuth client ID form, with Desktop app and the Create button marked](/guides/google/09.webp)

### 6. Copy the client ID and secret

Google shows the **Client ID** and the **Client secret**. Copy each one straight into your `.env` file, as *Save it* shows. You can not see the secret again after you close the window.

![Drawing of the OAuth client created window: the Client ID and Client secret boxes, with their Copy buttons marked. The values are hidden.](/guides/google/10.svg)

### 7. Sign in one time

Save this script as `google-sign-in.mjs` in your project folder. It needs [Node.js](https://nodejs.org) 22 or newer, and nothing else:

```js
// Run: node google-sign-in.mjs — reads GOOGLE_CLIENT_ID and GOOGLE_CLIENT_SECRET from .env, then saves
// GOOGLE_REFRESH_TOKEN in .env. It never prints a token.
import { createHash, randomBytes } from "node:crypto";
import { readFileSync, writeFileSync } from "node:fs";
import { createServer } from "node:http";

const SCOPES = [
  "https://www.googleapis.com/auth/gmail.readonly",
  "https://www.googleapis.com/auth/drive.readonly",
  "https://www.googleapis.com/auth/spreadsheets.readonly",
  "https://www.googleapis.com/auth/calendar.readonly",
].join(" ");
const env = readFileSync(".env", "utf8");
const read = (name) => env.match(new RegExp(`^${name}=(.*)$`, "m"))?.[1].trim();
const clientId = read("GOOGLE_CLIENT_ID");
const clientSecret = read("GOOGLE_CLIENT_SECRET");
const verifier = randomBytes(32).toString("base64url");
const challenge = createHash("sha256").update(verifier).digest("base64url");
const state = randomBytes(16).toString("hex");
let redirect = "";

const listener = createServer(async (req, res) => {
  const url = new URL(req.url, redirect);
  const code = url.searchParams.get("code");
  if (!code || url.searchParams.get("state") !== state) return res.end("Sign-in failed. Run the script again.");
  const answer = await fetch("https://oauth2.googleapis.com/token", {
    method: "POST",
    body: new URLSearchParams({
      code, client_id: clientId, client_secret: clientSecret, code_verifier: verifier,
      grant_type: "authorization_code", redirect_uri: redirect,
    }),
  }).then((r) => r.json());
  if (answer.refresh_token) {
    const kept = env.replace(/^GOOGLE_REFRESH_TOKEN=.*$\n?/m, "").trimEnd();
    writeFileSync(".env", `${kept}\nGOOGLE_REFRESH_TOKEN=${answer.refresh_token}\n`);
    console.log("Saved GOOGLE_REFRESH_TOKEN in .env.");
    res.end("Done. You can close this tab.");
  } else {
    console.log("Google sent no refresh token:", answer.error ?? "unknown error");
    res.end("Sign-in failed. Look at the terminal.");
  }
  listener.close();
});

listener.listen(0, "127.0.0.1", () => {
  redirect = `http://127.0.0.1:${listener.address().port}`;
  const auth = new URL("https://accounts.google.com/o/oauth2/v2/auth");
  const params = {
    client_id: clientId, redirect_uri: redirect, response_type: "code", scope: SCOPES, state,
    code_challenge: challenge, code_challenge_method: "S256", access_type: "offline", prompt: "consent",
  };
  for (const [key, value] of Object.entries(params)) auth.searchParams.set(key, value);
  console.log(`Open this address in your browser, and sign in:\n${auth}`);
});
```

Run `node google-sign-in.mjs` in a terminal, in your project folder. Open the address it prints, and sign in. Google warns that it has not verified the app. You made the app, so tap **Continue**. Tick each box, and tap **Continue** again.

The terminal says `Saved GOOGLE_REFRESH_TOKEN in .env.` To read fewer apps, delete their lines from `SCOPES` before you run it.

![Drawing of Google's warning that it has not verified the app, with Continue marked](/guides/google/11.svg)

## Permissions to choose

Each scope lets the agent read one app. Choose only the apps the job needs:

| Scope | What it lets the agent do |
|-|-|
| `https://www.googleapis.com/auth/gmail.readonly` | Read email. It can not send or delete. |
| `https://www.googleapis.com/auth/drive.readonly` | Read files in Drive |
| `https://www.googleapis.com/auth/spreadsheets.readonly` | Read Google Sheets |
| `https://www.googleapis.com/auth/calendar.readonly` | Read calendars |

On the Workspace path, a scope can also read the mail and files of every person in your company. The agent reads only as the person in `GOOGLE_IMPERSONATE_EMAIL`. To read as a different person, change that one line.

## Save it

On the Workspace path, the command in step 4 saved the key. Add the email of the person the agent reads as. The `.env` file in your project folder then has these lines:

```bash
GOOGLE_SERVICE_ACCOUNT_JSON='{"type":"service_account","project_id":"...","private_key":"...",...}'
GOOGLE_IMPERSONATE_EMAIL=you@yourshop.com
```

On the personal Gmail path, add these lines. The sign-in script adds the third:

```bash
GOOGLE_CLIENT_ID=paste-the-client-id-here
GOOGLE_CLIENT_SECRET=paste-the-client-secret-here
GOOGLE_REFRESH_TOKEN=the-script-writes-this
```

Make sure git ignores `.env`, and keep a copy in your password manager: [Keep your keys safe](/guides/keep-keys-safe).

## Check it works

Save this script as `google-check.mjs` in your project folder. It works for both paths:

```js
// Run: node google-check.mjs — reads .env, and prints your Gmail address or the error. It never prints a key.
import { createSign } from "node:crypto";
import { readFileSync } from "node:fs";

const env = Object.fromEntries(
  readFileSync(".env", "utf8").split("\n").filter((line) => line.includes("="))
    .map((line) => [line.slice(0, line.indexOf("=")), line.slice(line.indexOf("=") + 1).trim().replace(/^'|'$/g, "")]),
);
const token = (body) =>
  fetch("https://oauth2.googleapis.com/token", { method: "POST", body: new URLSearchParams(body) }).then((r) => r.json());
let answer;
if (env.GOOGLE_REFRESH_TOKEN) {
  answer = await token({
    client_id: env.GOOGLE_CLIENT_ID, client_secret: env.GOOGLE_CLIENT_SECRET,
    refresh_token: env.GOOGLE_REFRESH_TOKEN, grant_type: "refresh_token",
  });
} else {
  const key = JSON.parse(env.GOOGLE_SERVICE_ACCOUNT_JSON);
  const part = (value) => Buffer.from(JSON.stringify(value)).toString("base64url");
  const now = Math.floor(Date.now() / 1000);
  const claims = {
    iss: key.client_email, sub: env.GOOGLE_IMPERSONATE_EMAIL, iat: now, exp: now + 3600,
    scope: "https://www.googleapis.com/auth/gmail.readonly", aud: "https://oauth2.googleapis.com/token",
  };
  const unsigned = `${part({ alg: "RS256", typ: "JWT" })}.${part(claims)}`;
  const signature = createSign("RSA-SHA256").update(unsigned).sign(key.private_key, "base64url");
  answer = await token({ grant_type: "urn:ietf:params:oauth:grant-type:jwt-bearer", assertion: `${unsigned}.${signature}` });
}
if (!answer.access_token) {
  console.log("No access:", answer.error, answer.error_description ?? "");
} else {
  const profile = await fetch("https://gmail.googleapis.com/gmail/v1/users/me/profile", {
    headers: { Authorization: `Bearer ${answer.access_token}` },
  }).then((r) => r.json());
  console.log(profile.emailAddress ? `It works: ${profile.emailAddress}` : profile.error);
}
```

Run `node google-check.mjs` in a terminal, in your project folder. It works when it prints `It works:` and your email address.

- `unauthorized_client` on the Workspace path: step 6 is not done, or it has not started working yet. Wait, and try again later.
- `invalid_grant` on the personal path: run `node google-sign-in.mjs` again.
- `accessNotConfigured`: turn on the Gmail API in step 2.

## If it leaks

**A service account key:**

1. Open [console.cloud.google.com/iam-admin/serviceaccounts](https://console.cloud.google.com/iam-admin/serviceaccounts) and tap your service account.
2. On the **Keys** tab, make a new JSON key, and save it in `.env` with the command in step 4. The command puts it in place of the old one.
3. Delete the old key: tap the bin beside its key ID. Only this makes the leaked key useless.

**A client secret:**

1. Open [console.cloud.google.com/auth/clients](https://console.cloud.google.com/auth/clients) and tap your client.
2. Tap **Add secret**. Put the new secret in `.env` in place of the old one.
3. Tap **Disable** beside the old secret, then delete it.

**A refresh token:** go to [myaccount.google.com/connections](https://myaccount.google.com/connections), choose your app, and remove its access. Then run `node google-sign-in.mjs` again to make a new token.

## Sources

- Google Cloud: [Create a Google Cloud project](https://developers.google.com/workspace/guides/create-project)
- Google Cloud: [Enable Google Workspace APIs](https://developers.google.com/workspace/guides/enable-apis)
- Google Cloud: [Create access credentials](https://developers.google.com/workspace/guides/create-credentials)
- Google Cloud: [Create and delete service account keys](https://cloud.google.com/iam/docs/keys-create-delete)
- Google Workspace Admin Help: [Control API access with domain-wide delegation](https://support.google.com/a/answer/162106)
- Google: [Using OAuth 2.0 for desktop apps](https://developers.google.com/identity/protocols/oauth2/native-app)
- Google: [Using OAuth 2.0 with service accounts](https://developers.google.com/identity/protocols/oauth2/service-account)
- Google Cloud: [Manage the app audience](https://support.google.com/cloud/answer/15549945)
- Gmail API: [users.getProfile](https://developers.google.com/workspace/gmail/api/reference/rest/v1/users/getProfile)
