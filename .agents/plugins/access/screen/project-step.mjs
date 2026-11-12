import { html } from "./vendor/preact-htm.mjs";
import { FinishStep } from "./notices.mjs";
import { PROJECT_REQUEST, SAVE_REQUEST } from "./status.mjs";

/** The one step left wherever Project code is given: first before the app can hand its project out, then before
 *  people can save changes too. The owner gets the request to copy; an Admin is told it is the owner's step. */
export function ProjectStep({ status }) {
  const installs = status.project === "ready";
  const left = installs ? status.projectSave ?? "ready" : status.project;
  if (left === "ready" || left === undefined) return null;
  if (left === "live") return html`<p><strong>Live app only.</strong> People install the project and save changes from the live app.</p>`;
  const key = left === "key";
  const lead = installs ? "Saving needs one more step" : "One step first";
  if (!status.viewer.owner) return html`<p><strong>${lead} for the owner.</strong> ${status.ownerEmail} ${key ? "adds a GitHub key" : "finishes Access setup"}.</p>`;
  if (installs) return key
    ? html`<${FinishStep} plain say="Let teammates save changes" request=${SAVE_REQUEST}><strong>${lead}.</strong> People can install the project now. To let them save changes, the app needs a newer GitHub key. Ask your assistant:<//>`
    : html`<${FinishStep} plain><strong>${lead}.</strong> People can install the project now. To let them save changes, ask your assistant:<//>`;
  return key
    ? html`<${FinishStep} plain say="Let teammates install the project" request=${PROJECT_REQUEST}><strong>${lead}.</strong> The app needs a GitHub key to hand the project out. Ask your assistant:<//>`
    : html`<${FinishStep} plain><strong>${lead}.</strong> The app does not know which project to hand out yet. Ask your assistant:<//>`;
}
