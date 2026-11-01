---
title: Connect Meta ads
name: Meta ads
summary: Facebook and Instagram ad results
order: 4
minutes: 15
needs: A Meta business portfolio where you have full control, with your ad account in it.
lastChecked: 2026-10-31
env: [META_ACCESS_TOKEN, META_AD_ACCOUNT_ID]
---

## What you make

You make a Meta app and a *system user*. A system user is a robot member of your business portfolio. You give it your ad account, and make a token for it. With `ads_read`, the token reads ad results. It can not make or change an ad.

## Steps

### 1. Make an app

Go to [developers.facebook.com/apps/creation](https://developers.facebook.com/apps/creation/) and sign in with Facebook. Type an app name, such as `AI assistant`. Check the contact email, and tap **Next**.

![The Create an app form on Meta for Developers, with the app name AI assistant typed, and Next marked](/guides/meta-ads/01.webp)

### 2. Choose the ads use case

Under **Use cases**, choose **Create & manage ads with Marketing API**. Tap **Next**.

![The Use cases step, with Create & manage ads with Marketing API chosen and marked](/guides/meta-ads/02.webp)

### 3. Connect your business portfolio

Under **Business**, choose the business portfolio that holds your ad account. Tap **Next** through **Requirements** and **Overview**, then tap **Go to dashboard**.

![The Business step, with a business portfolio chosen and Next marked](/guides/meta-ads/03.webp)

### 4. Add a system user

Go to [business.facebook.com/settings](https://business.facebook.com/settings). Under **Users**, tap **System users**, then **Add**. Type a name, such as `ai-assistant`. Under **System user role**, choose **Employee**, and tap **Create system user**.

![The System users page in Business settings, with the Add button marked](/guides/meta-ads/04.webp)

### 5. Give it your app and ad account

With the system user chosen, tap **Assign assets**. Under **Apps**, choose your new app and give it **Full control**. Under **Ad accounts**, choose your ad account and turn on **View performance** only. Tap **Assign**.

![The Assign assets window, with the ad account chosen and View performance marked](/guides/meta-ads/05.webp)

### 6. Choose the token's permissions

Tap **Generate token**. Choose your app. Under **Token expiration**, choose **Never**, or **60 days** if you want it to stop by itself. Tick only `ads_read` and `business_management`; read [Permissions to choose](#permissions-to-choose). Tap **Generate token**.

![The Generate token window, with the app chosen and ads_read and business_management ticked](/guides/meta-ads/06.webp)

### 7. Copy the token

Meta shows the token one time only. Copy it, and paste it straight into your `.env` file, as *Save it* shows. Do not paste it anywhere else.

![Drawing of the window that shows the new system user token once, with its Copy button marked. The token is hidden.](/guides/meta-ads/07.svg)

### 8. Find your ad account ID

In Business settings, under **Accounts**, tap **Ad accounts**, and choose your ad account. Copy the number under its name. It is not secret.

![The Ad accounts page in Business settings, with the ad account ID marked](/guides/meta-ads/08.webp)

## Permissions to choose

| Permission | What it lets the token do |
|-|-|
| `ads_read` | Read ad accounts, campaigns, and their results |
| `business_management` | Read the business portfolio that owns the ad account |
| `ads_management` | Make, change, and stop ads. Add it only when a job needs it. |

The token sees only the ad accounts you give the system user in step 5. **View performance** lets it read results. **Manage campaigns** lets it change ads too.

## Save it

Add these lines to the `.env` file in your project folder. Put only the number in `META_AD_ACCOUNT_ID`, with no `act_` before it:

```bash
META_ACCESS_TOKEN=paste-the-token-here
META_AD_ACCOUNT_ID=1234567890
```

Make sure git ignores `.env`, and keep a copy in your password manager: [Keep your keys safe](/guides/keep-keys-safe).

## Check it works

Run these commands in a terminal, in your project folder. The first proves the token works. The second reads your ad account:

```bash
set -a; . ./.env; set +a
curl -s -G https://graph.facebook.com/v26.0/me -d access_token="$META_ACCESS_TOKEN"
curl -s -G "https://graph.facebook.com/v26.0/act_$META_AD_ACCOUNT_ID" \
  -d fields=name,account_status -d access_token="$META_ACCESS_TOKEN"
```

The first works when it shows the system user's name. The second works when it shows your ad account's name; `"account_status":1` means the account is active. `"code":190` means the token is wrong. `"code":200` means the system user does not have the ad account: do step 5 again.

## If it leaks

1. Go to [business.facebook.com/settings](https://business.facebook.com/settings), and open **Users**, then **System users**.
2. Choose the system user, and tap **Revoke tokens**. Choose your app, and revoke. The leaked token stops working.
3. Make a new token (steps 6 and 7), and put it in `.env` in place of the old one.

## Sources

- Meta: [Create an app](https://developers.facebook.com/docs/development/create-an-app/)
- Meta: [System users](https://developers.facebook.com/docs/business-management-apis/system-users/)
- Meta: [Add system users to your business portfolio](https://www.facebook.com/business/help/503306463479099)
- Meta: [Marketing API authorization](https://developers.facebook.com/docs/marketing-api/get-started/authorization/)
- Meta: [Permissions reference](https://developers.facebook.com/docs/permissions/)
- Meta: [Ad account](https://developers.facebook.com/docs/marketing-api/reference/ad-account/)
