---
title: Connect Klaviyo
name: Klaviyo
summary: Email and text marketing
order: 3
minutes: 5
needs: A Klaviyo account where your role is Owner, Admin, or Manager.
lastChecked: 2026-10-31
env: [KLAVIYO_API_KEY]
---

## What you make

You make a private API key. It reads your Klaviyo account: campaigns, flows, lists, profiles, and results. Start with a read-only key: it can not send an email or change a list.

## Steps

### 1. Open your API keys

Sign in to [klaviyo.com](https://www.klaviyo.com). Tap your account name at the bottom left, then **Settings**, then **API keys**.

![Klaviyo's API keys page in Settings, with the Create Private API Key button marked](/guides/klaviyo/01.webp)

### 2. Name it and choose its access

Tap **Create Private API Key**. Type a name you will know later, such as `AI assistant`. Choose **Read-only key**, or choose **Custom key** to pick each part; read [Permissions to choose](#permissions-to-choose). Tap **Create**.

![The Create private API key form with a name typed, Read-only key chosen, and Create marked](/guides/klaviyo/02.webp)

### 3. Copy the key

Klaviyo shows the key one time only. It starts with `pk_`. Copy it, and paste it straight into your `.env` file, as *Save it* shows. Do not paste it anywhere else.

![Drawing of the window that shows the new private API key once, with its Copy button marked. The key is hidden.](/guides/klaviyo/03.svg)

## Permissions to choose

| Choice | What it lets the key do |
|-|-|
| **Read-only key** | Read everything, and change nothing |
| **Custom key** | Choose *No access*, *Read access*, or *Full access* for each part, such as Campaigns, Flows, Lists, Profiles, and Metrics |
| **Full access key** | Read and change everything, and send emails. Do not choose it for an agent. |

Start with **Read-only key**. If a job must change one part, make a custom key with **Full access** for that part only.

## Save it

Add this line to the `.env` file in your project folder:

```bash
KLAVIYO_API_KEY=pk_paste-the-rest-here
```

Make sure git ignores `.env`, and keep a copy in your password manager: [Keep your keys safe](/guides/keep-keys-safe).

## Check it works

Run this command in a terminal, in your project folder:

```bash
set -a; . ./.env; set +a
curl -s https://a.klaviyo.com/api/accounts \
  -H "Authorization: Klaviyo-API-Key $KLAVIYO_API_KEY" \
  -H "revision: 2026-10-15" \
  -H "accept: application/vnd.api+json" | head -c 200
```

It works when the answer starts with `{"data":[{"type":"account"`. `"status":401` means the key is wrong: make a new one.

## If it leaks

1. In Klaviyo, open **Settings**, then **API keys**.
2. Make a new key (step 2), and put it in `.env` in place of the old one.
3. Find the leaked key in the list, tap the **⋮** menu beside it, and delete it. The leaked key stops working.

## Sources

- Klaviyo: [Manage your account's API keys](https://help.klaviyo.com/hc/en-us/articles/7423954176283)
- Klaviyo: [Authenticate API requests](https://developers.klaviyo.com/en/docs/authenticate_)
- Klaviyo: [API scopes](https://developers.klaviyo.com/en/docs/authenticate_#api-scopes)
- Klaviyo: [Get accounts](https://developers.klaviyo.com/en/reference/get_accounts)
- Klaviyo: [API versioning](https://developers.klaviyo.com/en/docs/api_versioning_and_deprecation_policy)
