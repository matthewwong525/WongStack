import { html, useMemo } from "./vendor/preact-htm.mjs";
import { levelName } from "./levels.mjs";
import { Label } from "./ui.mjs";

let made = 0;

/** One level as a segmented choice: real radio buttons kept on screen, so arrow keys move it. `state` is a quiet word
 *  beside the name; `notes` are quiet lines under the row, the empty ones left out; `children` come after them. */
export function LevelChoice({ legend, state, levels, value, notes = [], onChange, children }) {
  const name = useMemo(() => `access-level-${++made}`, []);
  return html`<fieldset class="grid min-w-0 gap-1.5">
    <legend class="mb-1 text-sm">${legend}${state && [" ", html`<span class="text-muted-foreground">· ${state}</span>`]}</legend>
    <div class="flex flex-wrap items-center">${[null, ...levels].map(level =>
      html`<${Label} class="-ms-px cursor-pointer border px-3 py-2 font-normal first:ms-0 first:rounded-s-md last:rounded-e-md has-checked:bg-secondary has-checked:font-semibold" key=${levelName(level)}>
        <input type="radio" class="size-4 accent-primary" name=${name} checked=${value === level} onChange=${() => onChange(level)} />${levelName(level)}
      <//>`)}
    </div>
    ${notes.filter(Boolean).map(note => html`<p class="text-sm text-muted-foreground" key=${note}>${note}</p>`)}
    ${children}
  </fieldset>`;
}
