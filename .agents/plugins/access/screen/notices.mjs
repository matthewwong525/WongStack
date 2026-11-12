import { html } from "./vendor/preact-htm.mjs";
import { CopyText } from "./copy-text.mjs";
import { useWhere } from "./router.mjs";
import { FINISH_REQUEST } from "./status.mjs";
import { Alert, Button } from "./ui.mjs";
import { WelcomeDialog } from "./welcome.mjs";

/** A step the owner hands to their assistant: the words to say, and the full request to copy. Left out, they
 *  are the ones for finishing Access setup. Where a key or a set is opened it is `plain`: no box is needed there. */
export function FinishStep({ plain = false, say = "Finish Access setup", request = FINISH_REQUEST, children }) {
  const step = [
    html`<p key="say">${children} <q>${say}</q></p>`,
    html`<${CopyText} key="copy" text=${request} label="Copy that request" />`,
  ];
  return plain ? html`<div class="grid gap-2">${step}</div>` : html`<${Alert}>${step}<//>`;
}

// Why the sign-in list could not be read, by the reason code the status read sends. Anything else: an odd answer.
const START_REASONS = {
  login_policy_review_required: "The sign-in list has a rule this app does not manage, so a person must check it.",
  login_resource_mismatch: "The sign-in app does not match this app.",
  provider_unavailable: "Cloudflare did not answer.",
  provider_not_found: "Cloudflare did not answer.",
};
const startReason = code => (Object.hasOwn(START_REASONS, code) ? START_REASONS[code] : "Cloudflare's answer was not in a shape this app reads.");

// The one spot for notices, under the views on every owner screen: the last change, a preview's practice list, who
// an update unticked and, on People alone, the steps left before sign-in. The missing key is the owner's step.
export function Notices({ status, view, said, pending, save, reload }) {
  const people = view.name === "people";
  const unticked = status.apps ? [...status.unticked.people.map(person => `${person.email}: ${person.apps.join(", ")}`),
    ...status.unticked.roles.map(role => `${role.name} role: ${role.apps.join(", ")}`)] : [];
  // The person a save just gave the project, as the list now holds them. Each save opens its popup once.
  const given = said?.welcome ? status.people.find(person => person.email === said.welcome.trim().toLowerCase() && person.status === "active") : undefined;
  const { key } = useWhere();
  return [
    said && html`<${Alert} key="said" role=${said.failed ? "alert" : "status"}><p>
      <strong>${said.text}</strong>
      ${said.undo && [" ", html`<${Button} variant="outline" size="sm" class="ms-2" disabled=${pending} onClick=${() => save("people", said.undo, { text: "Undone." })}>Undo<//>`]}
    </p><//>`,
    given && html`<${WelcomeDialog} key=${key} status=${status} person=${given} />`,
    status.environment !== "live" && html`<${Alert} key="practice"><p><strong>Practice list.</strong> Changes here stay on previews. The real sign-in list is not touched.</p><//>`,
    // The "!" and the bold words mark it: nothing depends on colour.
    unticked.length > 0 && html`<${Alert} key="unticked">
      <p><strong><span aria-hidden="true">! </span>Unticked in this update</strong></p>
      <p>They could only look, and a tick gives everything:</p>
      <ul class="grid gap-1 ps-4">${unticked.map(line => html`<li key=${line}>${line}</li>`)}</ul>
      <p>Tick an app to give it back.</p>
    <//>`,
    people && status.key === "missing" && (status.viewer.owner
      ? html`<${FinishStep} key="missing"><strong>One step left.</strong> You can choose apps now. To let new people sign in, ask your assistant:<//>`
      : html`<${Alert} key="missing"><p><strong>One step left for the owner.</strong> You can choose apps now. New people can sign in once ${status.ownerEmail} finishes Access setup.</p><//>`),
    people && status.key === "ready" && !status.started && html`<${Alert} key="start">
      <p>The sign-in list could not be read yet. Everyone keeps every app until it can.</p>
      ${status.startError && html`<p class="text-muted-foreground">Why: ${startReason(status.startError)} <small>(${status.startError})</small></p>`}
      <${Button} variant="outline" size="sm" onClick=${reload}>Read it again<//>
    <//>`,
    people && status.imported > 0 && html`<${Alert} key="imported"><p>
      ${status.imported === 1 ? "1 person" : `${status.imported} people`} could already sign in. They keep every app until you change them.
    </p><//>`,
  ];
}
