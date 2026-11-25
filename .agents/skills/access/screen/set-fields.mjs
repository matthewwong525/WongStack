import { html } from "./vendor/preact-htm.mjs";
import { Group, Tick } from "./fields.mjs";
import { LevelChoice } from "./level-choice.mjs";
import { keyLine, keyState } from "./levels.mjs";
import { FinishStep } from "./notices.mjs";
import { ProjectStep } from "./project-step.mjs";
import { WelcomeFold } from "./welcome.mjs";

/** What a key that is not saved yet waits for. Setup makes one key itself: the owner copies a request, an Admin is
 *  told it is the owner's step, and a preview has no step. Any other key comes through its link. */
function NextStep({ status, item }) {
  if (!item.setup) return html`<p class="text-sm">Ask your assistant for the key link.</p>`;
  if (status.environment !== "live") return null;
  return status.viewer.owner
    ? html`<${FinishStep} plain>Look-ups need a read-only key. Ask your assistant:<//>`
    : html`<p class="text-sm">Look-ups need a read-only key. ${status.ownerEmail} finishes that in Access setup.</p>`;
}

/** One set, a person's or a role's: a tick per app and a level per key, where the project gives them, then a Project
 *  code tick where it hands one out, which folds out a saved person's welcome. Nothing here saves. */
export function SetFields({ status, set, onChange, person }) {
  // Project code is two ticks: Read installs and saves, Write also publishes, so publishing needs the install tick.
  const project = status.project !== undefined && status.keys?.find(key => key.id === "code");
  const installs = set.keys.code === "read" || set.keys.code === "write";
  const code = level => onChange({ ...set, keys: { ...set.keys, code: level } });
  return [
    status.apps && html`<${Group} key="apps" legend="Apps">
      ${status.apps.map(app => html`<${Tick} key=${app.id} checked=${set.apps.includes(app.id)}
        onChange=${on => onChange({ ...set, apps: on ? [...set.apps, app.id] : set.apps.filter(id => id !== app.id) })}>${app.title}<//>`)}
      ${!status.apps.length && html`<p>No apps built yet. Ask your assistant to make one.</p>`}
    <//>`,
    status.keys && html`<${Group} key="keys" legend="Keys">
      <p class="text-sm text-muted-foreground">For using a key by itself. Apps need no level.</p>
      ${status.keys.filter(key => key.id !== "code").map(key => html`<${LevelChoice} key=${key.id} legend=${key.title} state=${keyState(key, status.environment)}
        levels=${key.levels} value=${set.keys[key.id] ?? null} notes=${[keyLine(key)]} onChange=${level => onChange({ ...set, keys: { ...set.keys, [key.id]: level } })}>
        ${!key.saved && html`<${NextStep} status=${status} item=${key} />`}
      <//>`)}
      ${!status.keys.length && html`<p>No keys saved yet.</p>`}
    <//>`,
    project && html`<${Group} key="project" legend="Project">
      <${Tick} checked=${installs} onChange=${to => code(to ? "read" : null)}>Can install the project<//>
      <p class="text-sm text-muted-foreground">They can save changes too.</p>
      ${person?.status === "active" && installs && status.project === "ready" && html`<${WelcomeFold} status=${status} person=${{ email: person.email, role: null, keys: set.keys }} />`}
      ${project.levels.includes("write") && [
        html`<${Tick} key="publish" checked=${set.keys.code === "write"} disabled=${!installs} onChange=${to => code(to ? "write" : "read")}>Can publish<//>`,
        html`<p key="publish-note" class="text-sm text-muted-foreground">Their changes go live once the checks pass.</p>`,
      ]}
      ${(installs || status.project === "live") && html`<${ProjectStep} status=${status} />`}
    <//>`,
  ];
}
