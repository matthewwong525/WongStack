---
title: Keep your keys safe
summary: Where to keep a key, how much access to give it, and what to do if it leaks
lastChecked: 2026-10-31
---

A key acts like a password to your business. Anyone who has it can do what the key allows: read your orders, send emails to your customers, or spend money on ads. Keep it as safe as your bank password.

## Put it in a .env file

A `.env` file is a plain text file in your project folder. It holds one key on each line, a name, then `=`, then the value:

```bash
KLAVIYO_API_KEY=paste-the-key-here
```

Your tools and your AI agent read keys from this file, so the key never has to go anywhere else.

Make sure git ignores the file, so it never goes into your code history. Open the file named `.gitignore` in the same folder, and check that it has this line. If it does not, add it:

```bash
.env
```

## Never put a key in these places

- A chat, with a person or with an AI agent
- An email or a text message
- A screenshot or a screen recording
- A shared document or spreadsheet
- A public code repository, or any file that git saves

If a key goes into one of these places, treat it as leaked.

## Give each key the least access it needs

When a tool asks what the key can do, choose only what the job needs. Start with *read only*. Add more later, if a job needs it. A read-only key that leaks can not change or delete anything.

Make a different key for each job or each tool that uses it. Then you can replace one key without stopping the others.

## Keep a copy in a password manager

Save each key in your password manager too, such as 1Password, Bitwarden, or the one in your browser. Write what the key is for and the date you made it. Then you can find it again if you move to a new computer.

## If a key leaks

Do these steps at once:

1. Make a new key at the tool, the same way you made the first one.
2. Put the new key in `.env` in place of the old one.
3. Delete the old key at the tool.

Only step 3 makes the leaked key useless. Until you delete it, anyone who has it can use it. Each guide tells you where to delete the key in its *If it leaks* part.

After you delete it, look at the tool's activity or log page for actions you did not do.

## Guides

Each guide tells you how to get one key and save it safely: [all guides](/guides).
