# Test a live view on a real browser

Test a change to [the live view](../../.agents/plugins/browser/skills/hand-over/references/live-view.md) in a throwaway browser on this server, never in the shared one: the shared browser may hold a real person's open turn, and a test tab brought to the front takes their screen.

## Set up a throwaway home

Give the run its own home folder, and link in only what is slow to install:

```bash
T=$(mktemp -d /tmp/lv-walk-XXXX)
mkdir -p $T/.wong-stack/camoufox/tmp $T/.wong-stack/live-view $T/a $T/b
for name in venv cache; do ln -s ~/.wong-stack/camoufox/$name $T/.wong-stack/camoufox/$name; done
ln -s ~/.wong-stack/live-view/novnc-* $T/.wong-stack/live-view/
echo '{"proxy":false}' > $T/.wong-stack/browser-settings.json
```

Run every `browse.mjs` and `hand-over.mjs` command with `HOME=$T`. The browser then starts its own server and its own virtual screen, with none of the person's sign-ins.

A throwaway home can't test a 1Password sign-in: a copied profile loses 1Password's sign-in and opens its Welcome page. Test that in the shared browser, after the person says yes to a restart.

## Act as several chats

A chat's name is its folder's name, so `cd $T/a` and `cd $T/b` are two chats. Open a page in each with `browse.mjs open`, then `hand-over.mjs open --view` from each.

Give each chat's page a different title, such as `example.com` and `iana.org/help/example-domains`. The shown tab is the window's title (`DISPLAY=<the view's display> xdotool search --onlyvisible --classname Navigator getwindowname %@`), and `example.com` and `example.org` share one.

Press the view's buttons through its own routes on `127.0.0.1:<port>`, with the `x-hand-over-key` header. Both values are in `$T/.wong-stack/hand-over/view/state.json`. Never print the key.

To test what the view's page does when a person opens a link, load `http://127.0.0.1:<port>/#key=<key>&chat=<name>` in a separate headless browser, such as Playwright's Chromium, never in the agent's browser: that browser is the screen under test. Then read `/view` to see which tab shows.

## Expect the wake-up in your own chat

The test chats run inside your workspace, so each *Hand back* wakes **your** chat, and that message stops the command that is running. Run each `wait` in the background, read its output file afterwards, and treat the wake-up as the test's result, not as the person.

## Clean up

Run `HOME=$T browse.mjs stop`, check that the link answers no more, then `rm -rf $T`. Don't `pkill -f` a script's name: the pattern also matches your own shell's command line and stops it.

Part of [Maintaining WongStack](README.md).
