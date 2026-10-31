---
title: Connect Slack
name: Slack
summary: Messages and channels
order: 7
minutes: 5
needs: A Slack workspace where you can add apps. If your workspace needs approval for apps, an owner or app manager must approve it.
lastChecked: 2026-10-31
env: [SLACK_BOT_TOKEN]
---

## What you make

You make a small Slack app, called a bot. The bot can read the channels you invite it to, see who is in the workspace, and post messages. It can not read a channel until you invite it, and it can never read direct messages.

## Steps

### 1. Open your Slack apps

Go to [api.slack.com/apps](https://api.slack.com/apps) and sign in with your Slack account. Tap **Create New App**.

![The Your Apps page on api.slack.com, with the Create New App button marked](/guides/slack/01.webp)

### 2. Choose From a manifest

A manifest is a short setup text that tells Slack what the app can do. This guide gives you one, so you do not have to choose each setting. Choose **From a manifest**, then tap **Continue**.

![The Create new app window, with From a manifest and Continue marked](/guides/slack/02.webp)

### 3. Paste the setup text

Tap the **YAML** tab. Delete the sample text in the box. Copy all of this text and paste it into the box:

```yaml
display_information:
  name: AI assistant
  description: Reads and posts in the channels you invite it to.
features:
  bot_user:
    display_name: ai-assistant
    always_online: false
oauth_config:
  scopes:
    bot:
      - channels:read
      - channels:history
      - groups:read
      - groups:history
      - users:read
      - chat:write
settings:
  org_deploy_enabled: false
  socket_mode_enabled: false
  token_rotation_enabled: false
```

You can change `AI assistant` to any name, up to 35 characters. Keep `display_name` in small letters with no spaces. To see what each line allows, read [Permissions to choose](#permissions-to-choose).

![The Create from a manifest window, with the YAML tab marked and the setup text pasted in the box](/guides/slack/03.webp)

### 4. Pick your workspace

Under **Workspace**, open the list and choose the workspace the bot will work in. You can not change it later. Tap **Next**.

![The Workspace list open under the setup text, with the list marked](/guides/slack/04.webp)

### 5. Make and add the app

Slack shows what the app can do. Tap **Create and Install**.

![The Review your app window, with the Create and Install button marked](/guides/slack/05.webp)

### 6. Allow it

Slack asks for permission to add the app to your workspace. Tap **Allow**.

If your workspace needs approval for apps, you see a request button in place of **Allow**. Send the request, and wait for an owner or app manager to approve it.

![Drawing of Slack's permission screen: AI assistant is asking to access your workspace, with Allow marked](/guides/slack/06.svg)

### 7. Copy the bot token

In the menu on the left, tap **Install App**. Copy the **Bot User OAuth Token**. It starts with `xoxb-`. You can also find it under **OAuth & Permissions**.

Paste it straight into your `.env` file, as *Save it* shows. Do not paste it anywhere else.

![Drawing of the Install App page: the Bot User OAuth Token box, with its Copy button marked. The token is hidden.](/guides/slack/07.svg)

### 8. Invite the bot to each channel

The bot reads only the channels you invite it to. In each channel, type `/invite @`, choose **AI assistant** from the list, and send the message. Slack posts a line that says the app joined the channel.

![Drawing of a Slack channel's message box with /invite @AI assistant typed in it](/guides/slack/08.svg)

## Permissions to choose

Each line under `bot:` in the setup text gives the bot one permission:

| Permission | What it lets the bot do |
|-|-|
| `channels:read` | See the list of public channels |
| `channels:history` | Read messages in public channels it is invited to |
| `groups:read` | See private channels it is invited to |
| `groups:history` | Read messages in private channels it is invited to |
| `users:read` | See the names of people in the workspace |
| `chat:write` | Post messages |

To start read-only, delete the `chat:write` line before step 3. To keep it out of private channels, delete both `groups:` lines.

To change a permission later, open the app at [api.slack.com/apps](https://api.slack.com/apps), tap **OAuth & Permissions**, and change the scopes. Then tap **Reinstall to Workspace** on the **Install App** page.

Keep `token_rotation_enabled: false`. If you turn it on, the token stops working after 12 hours, and you can never turn it off again.

## Save it

Add this line to the `.env` file in your project folder:

```bash
SLACK_BOT_TOKEN=xoxb-paste-the-rest-here
```

Make sure git ignores `.env`, and keep a copy in your password manager: [Keep your keys safe](/guides/keep-keys-safe).

## Check it works

Run this command in a terminal, in your project folder:

```bash
set -a; . ./.env; set +a
curl -s -X POST -H "Authorization: Bearer $SLACK_BOT_TOKEN" https://slack.com/api/auth.test
```

It works when the answer starts with `{"ok":true` and names your workspace. `"error":"invalid_auth"` means the token is wrong: copy it again from step 7.

If you can not run a command: open a channel you invited the bot to. The bot shows in the channel's member list.

## If it leaks

1. Stop the leaked token. Run this command in your project folder, while `.env` still holds the leaked token:

   ```bash
   set -a; . ./.env; set +a
   curl -s -X POST -H "Authorization: Bearer $SLACK_BOT_TOKEN" https://slack.com/api/auth.revoke
   ```

   It worked when the answer has `"revoked":true`. The token stops working at once, and the bot leaves its channels.
2. Open your app at [api.slack.com/apps](https://api.slack.com/apps). Tap **Install App**, then **Reinstall to Workspace**, and tap **Allow**. Slack makes a new token.
3. Put the new token in `.env` in place of the old one, and invite the bot to its channels again (step 8).

If you do not need the bot any more, remove it in Slack: **Tools & settings**, then **Manage apps**, then choose the app and tap **Remove App**.

## Sources

- Slack: [Configuring apps with app manifests](https://docs.slack.dev/app-manifests/configuring-apps-with-app-manifests)
- Slack: [App manifest reference](https://docs.slack.dev/reference/app-manifest)
- Slack: [Tokens](https://docs.slack.dev/authentication/tokens)
- Slack: [auth.test](https://docs.slack.dev/reference/methods/auth.test) and [auth.revoke](https://docs.slack.dev/reference/methods/auth.revoke)
- Slack: [Manage app approval for your workspace](https://slack.com/help/articles/222386767-Manage-app-approval-for-your-workspace)
- Slack: [Remove apps from your workspace](https://slack.com/help/articles/360003125231-Remove-apps-and-custom-integrations-from-your-workspace)
