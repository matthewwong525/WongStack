import { html } from "./vendor/preact-htm.mjs";
import { readApps, useAccess } from "./api.mjs";
import { useScreen } from "./context.mjs";
import { FinishStep } from "./notices.mjs";
import { Own } from "./own.mjs";
import { LoadingPeople, Owner, Unavailable } from "./owner.mjs";

// The owner and an Admin manage people and roles, and find themselves in the People table; everyone else sees what
// they can use. The page sets no width or margin of its own; it measures itself, so rows stack by the room they have.
export function App() {
  const { data, error, reload } = useAccess(useScreen().api, "apps", readApps);
  const manages = !!data && data.state !== "legacy" && (data.role === "owner" || !!data.manages);
  return html`<div class="@container grid gap-4">
    <h1>Access</h1>
    ${!data && !error && html`<${LoadingPeople} />`}
    ${error && html`<${Unavailable} reload=${reload} />`}
    ${data?.state === "legacy" && html`<${FinishStep}><strong>Access setup is not finished.</strong> Everyone who signs in keeps every app. To choose apps per person, ask your assistant:<//>`}
    ${data && data.state !== "legacy" && (manages ? html`<${Owner} />` : html`<${Own} apps=${data.apps} keys=${(data.state === "current" && data.keys) || []} />`)}
  </div>`;
}
