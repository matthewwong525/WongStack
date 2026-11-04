# File uploads

The agent gives a page files from this computer with `browse.mjs upload`, as if you picked them yourself. It is one command of [browsing](browsing.md).

```bash
B=.claude/skills/browser/scripts/browse.mjs
node $B upload 'input[type=file]' ~/projects/report.pdf ~/projects/photo.jpg
# BROWSE_UPLOADED=2
# BROWSE_UPLOAD_VIA=box      box: the file box got them; picker: the picker a button opened got them
```

1. **Name the place, then the files.** Name the file box, the drop area that holds one, or the button that opens the file picker. A hidden file box has no ref, so name it by `input[type=file]`, or by a narrower selector when the page has more than one. A relative path starts at the folder you run the command in.
2. **Upload only the files the task needs.** Name each file in the chat. The site's order or pay step still waits for your yes.
3. **Read the page after.** The site sends the files itself. Read the page or take [a picture](browsing.md#show-what-the-browser-is-doing) to see its upload finish.

A [live view](live-view.md) can't do this step: it shows only the page, so the computer's file picker never gets to you.

**The whole upload stops, and the page gets no file, when one path is wrong.** One `BROWSE_ERROR=` line names the path:

- **Missing, or a folder.** Only a file goes.
- **Private.** A `.env` file anywhere (`.env.example` is not private), or a file with a hidden folder or name anywhere in its path, such as `~/.wong-stack/logins.json`, `~/.ssh/id_ed25519` or `/tmp/.hidden/x.pdf`. The rule is by place, not by a list of known secret files: the home folder holds token files with no fixed names, and a list misses the next one. A copy of the home folder, or a second path to it such as a bind mount, stops too, because the hidden part is still in the path. The chats' work folders, at and below a `.paseo/worktrees/` folder, are not private. The script follows a link first, so a link to a private file stops too. The browser's server checks again, so a direct call can't send a private file.
- **Too many files.** A box or picker that takes one file refuses two.

**A box, a drop area, or a button that gives no file box and no picker** stops with one plain line. A drop area that takes only a dragged file ends with [steps for you to finish](finish-steps.md).

**An older browser** prints `BROWSE_ERROR=the running browser is older than the upload command; it gets it at its next start`. A running browser [gets a change only at its next start](browsing.md#saved-browser-logins), and other chats use it. When a task waits on an upload, ask the person before `browse.mjs stop`.

Back to [browsing](browsing.md).
