import { html } from "./vendor/preact-htm.mjs";
import { useScreen } from "./context.mjs";
import { Labels } from "./labels.mjs";
import { levelLabel } from "./levels.mjs";
import { Card } from "./ui.mjs";

/** What a person who manages nothing can use: a label per app, by its title, and one per saved key with their level.
 *  An app has no level: all of it is theirs. Access itself is everyone's, so it is not named. */
export function Own({ apps, keys }) {
  const { appTitle } = useScreen();
  return html`<section aria-labelledby="access-own" class="min-w-0"><${Card} class="gap-2 p-4 wrap-anywhere">
    <h2 id="access-own">You can use</h2>
    <${Labels} title="Apps" items=${apps.filter(app => app !== "access").map(appTitle)} none="No apps yet. Ask your employer." />
    <${Labels} title="Keys" items=${keys.map(key => levelLabel(key.title, key.level))} />
  <//></section>`;
}
