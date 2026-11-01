---
title: Connect Notion
name: Notion
summary: Notes and docs
order: 8
minutes: 5
needs: A Notion workspace. In some workspaces, only a Workspace Owner can make a connection.
lastChecked: 2026-10-31
env: [NOTION_TOKEN]
---

## What you make

You make a Notion connection with its own API token. The token can use only the pages you share with the connection, and the pages inside them. It can not see any other page in your workspace.

## Steps

### 1. Open your connections

Go to [app.notion.com/developers/connections](https://app.notion.com/developers/connections) and sign in to Notion. You see **Developer tools**, with the **Connections** tab open. Tap **New connection**.

![The Connections tab of Notion's Developer tools, with the New connection button marked](/guides/notion/01.webp)

### 2. Name it and choose API token

Type a name you will know later, such as `AI assistant`. Under **Authentication method**, keep **API token**. Tap **Create connection**.

If you have more than one workspace, choose the one that holds your pages.

![The New connection window with the name AI assistant typed, and API token and Create connection marked](/guides/notion/02.webp)

### 3. Choose what it can do

Open the **Configuration** tab. Choose only what the job needs; read [Permissions to choose](#permissions-to-choose). To start read-only, tick only **Read content**, and choose **No user information**. If you see a save button, tap it.

![Drawing of the connection's Configuration tab: Read content is ticked, and the Users choice is No user information](/guides/notion/03.svg)

### 4. Copy the API token

On the same **Configuration** tab, find **API token** and copy it. It starts with `ntn_`.

Paste it straight into your `.env` file, as *Save it* shows. Do not paste it anywhere else.

![Drawing of the Configuration tab's API token box, with its Copy button marked. The token is hidden.](/guides/notion/04.svg)

### 5. Share pages with it

The connection sees nothing until you share pages with it. Open the **Content access** tab, tap **Edit access**, and choose the pages it can use. A page you share also shares every page inside it.

You can also share from a page: open the page, tap **•••** at the top right, find **Connections**, and add your connection.

![Drawing of the Content access tab, with the Edit access button marked and two shared pages listed](/guides/notion/05.svg)

## Permissions to choose

| Choice | What it lets the token do |
|-|-|
| **Read content** | Read the pages you share |
| **Update content** | Change those pages |
| **Insert content** | Add new pages and blocks inside them |
| **Read comments**, **Insert comments** | Read or add comments |
| **User information** | See people's names, and with the last choice, their email addresses |

Start with **Read content** only. Share the fewest pages the job needs: a parent page shares all of its pages.

## Save it

Add this line to the `.env` file in your project folder:

```bash
NOTION_TOKEN=ntn_paste-the-rest-here
```

Make sure git ignores `.env`, and keep a copy in your password manager: [Keep your keys safe](/guides/keep-keys-safe).

## Check it works

Run these commands in a terminal, in your project folder. The first proves the token works. The second lists the pages you shared:

```bash
set -a; . ./.env; set +a
curl -s https://api.notion.com/v1/users/me \
  -H "Authorization: Bearer $NOTION_TOKEN" \
  -H "Notion-Version: 2026-03-11"
curl -s -X POST https://api.notion.com/v1/search \
  -H "Authorization: Bearer $NOTION_TOKEN" \
  -H "Notion-Version: 2026-03-11" \
  -H "Content-Type: application/json" \
  --data '{"page_size": 5}'
```

The first works when the answer has `"type":"bot"`. In the second, an empty `"results":[]` means you have not shared a page yet: do step 5. `"code":"unauthorized"` means the token is wrong.

## If it leaks

1. Open the connection at [app.notion.com/developers/connections](https://app.notion.com/developers/connections).
2. On the **Configuration** tab, tap **Refresh** beside the API token. Notion makes a new token, and the leaked one stops working.
3. Put the new token in `.env` in place of the old one.

To take one page away from the connection, open the page, find **Connections** in the **•••** menu, and tap **Disconnect** beside it.

## Sources

- Notion: [Internal connections](https://developers.notion.com/guides/get-started/internal-connections)
- Notion: [Capabilities](https://developers.notion.com/reference/capabilities)
- Notion: [Handling API keys](https://developers.notion.com/guides/get-started/handling-api-keys)
- Notion: [Retrieve your token's bot user](https://developers.notion.com/reference/get-self) and [Search](https://developers.notion.com/reference/post-search)
- Notion: [Versioning](https://developers.notion.com/reference/versioning)
- Notion: [Add and manage connections](https://www.notion.com/help/add-and-manage-connections-with-the-api)
