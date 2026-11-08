# Watch link

The watch link is a [live view](live-view.md) the agent drives, for [connecting your tools](../stack/connect-your-tools.md#use-the-assistants-browser) on a server. It opens only when a tool asks you to sign in, or when you ask to watch. The bar's line says what to do now:

| Who has the browser | The line | The button | Your taps reach it |
|---|---|---|---|
| The assistant | what it does now, such as *Clicking New integration…* | *Take over* | no |
| You, after *Take over* | *Tap Hand back when you're done.* | *Hand back* | yes |
| You, on your turn to sign in | *Sign in to Notion, then tap Hand back.* | *Hand back* | yes |

Only *Take over* takes the browser, never a stray tap. To stop the run, say so in the chat. The page then says *Stopped. Go back to the chat.*, or at the end *All done. Go back to the chat.*

The connect helper runs it through [`hand-over.mjs`](../../.agents/skills/hand-over/scripts/hand-over.mjs). `open --watch --session <name> --note <line>` opens it until `close` or `close --stopped`. `line <text>` sets the line. `turn --note <line>` gives you the browser to sign in, until you tap *Hand back*: a signed-in page ends no turn. `wait` prints each change once: `opened`, `taken-over` (which also wakes an idle chat), `handed-back`, and at the end `done` or `stopped`.

Back to [the live view](live-view.md).
