import { html, useState } from "./vendor/preact-htm.mjs";
import { readPushers, useAccess } from "./api.mjs";
import { useScreen } from "./context.mjs";
import { Cell, Name, Row, Table } from "./table.mjs";
import { Badge, Button, Input } from "./ui.mjs";

const COLUMNS = ["GitHub name", "Email", "Sign-in"];
const HEADING = "access-pushers";

/** Why no pusher is listed, or what holds them back: one line each. Null where the rows say it all. */
const LINES = {
  no_github: [html`<strong>No GitHub key.</strong>`, " Once the app holds the project's GitHub key, people who can push are listed here."],
  live_only: [html`<strong>Live app only.</strong>`, " The live app reads who can push on GitHub."],
  not_started: [html`<strong>Finish Access setup.</strong>`, " Then people who can push on GitHub can open previews."],
};

/** One field and Save, for a pusher whose email GitHub doesn't share. */
function EmailField({ pusher, saved }) {
  const { api } = useScreen();
  const [email, setEmail] = useState("");
  const [state, setState] = useState("idle");
  const save = async () => {
    setState("saving");
    try { await api.savePusherEmail(pusher.githubId, email); saved(); } catch { setState("failed"); }
  };
  return html`<form class="flex flex-wrap items-center gap-2" onSubmit=${event => { event.preventDefault(); void save(); }}>
    <${Input} type="email" required class="h-8 w-48 max-w-full" aria-label=${`Email for @${pusher.login}`} placeholder=${`@${pusher.login}'s email`}
      value=${email} onValue=${setEmail} />
    <${Button} type="submit" size="sm" disabled=${state === "saving"}>Save<//>
    ${state === "failed" && html`<span role="alert" class="text-destructive">That did not save. Try again.</span>`}
  </form>`;
}

/** The People view's section for people who can push on GitHub: they can open previews, never the live app. A project
 *  with no such list answers nothing here, and the section stays hidden. */
export function Pushers({ view }) {
  // A failed load hides the section: the people table above is the screen's main thing.
  const { data, reload } = useAccess(useScreen().api, "pushers", readPushers);
  if (!data || data.state === "not_github") return null;
  const line = LINES[data.state];
  const split = data.split !== false;
  return html`<section aria-labelledby=${HEADING} class="grid gap-2">
    <div class="flex items-center gap-2"><h2 id=${HEADING} class="text-base font-semibold">Can push on GitHub</h2>
      <${Badge} variant="secondary">${data.pushers.length}<//></div>
    <p class="text-muted-foreground">They can open previews, not the live app.</p>
    ${line && html`<p>${line}</p>`}
    ${!split && html`<p><strong>Finish Access setup.</strong> Previews share the live app's sign-in until then.</p>`}
    ${data.state === "unavailable" && html`<p class="text-muted-foreground">Couldn't reach GitHub. This is the last list.</p>`}
    ${data.pushers.length > 0 && html`<${Table} view=${view} label=${HEADING} columns=${COLUMNS}>
      ${data.pushers.map(pusher => html`<${Row} key=${pusher.githubId}>
        <${Name} title=${`@${pusher.login}`} />
        <${Cell} label="Email" class=${pusher.email ? "text-muted-foreground" : "text-destructive"}>${pusher.email ?? "Needs an email"}<//>
        <${Cell} label="Sign-in">${pusher.email
          ? html`<${Badge} variant="outline">${pusher.canOpenPreviews ? "Can open previews" : "Finish Access setup"}<//>`
          : html`<${EmailField} pusher=${pusher} saved=${reload} />`}<//>
      <//>`)}
    <//>`}
  </section>`;
}
