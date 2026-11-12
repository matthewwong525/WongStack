import { html } from "./vendor/preact-htm.mjs";
import { appLabels, levelLabels } from "./levels.mjs";
import { Badge } from "./ui.mjs";

/** Short strings as small labels, each with its words written out and a border round it, so a label is never marked
 *  by colour alone. The row wraps and a long label breaks. With none, `none` says so. */
function Names({ title, items, none }) {
  if (!items.length) return none ? html`<p>${none}</p>` : null;
  return html`<ul class="flex min-w-0 flex-wrap gap-1.5" aria-label=${title}>${items.map(item =>
    html`<li class="min-w-0" key=${item}><${Badge} variant="outline" class="max-w-full shrink rounded-xl text-left whitespace-normal wrap-anywhere">${item}<//></li>`)}</ul>`;
}

/** The labels under a heading of their own. */
export function Labels(props) {
  if (!props.items.length) return html`<${Names} ...${props} />`;
  return html`<div class="flex flex-wrap items-baseline gap-x-2.5 gap-y-1.5"><span class="text-muted-foreground">${props.title}</span><${Names} ...${props} /></div>`;
}

/** What a role gives, named where a person is opened: a label per app, then one per key with its level. Only what
 *  the project gives is named. */
export const SetLabels = ({ status, set }) => [
  status.apps && html`<${Labels} key="apps" title="Apps" items=${appLabels(status, set.apps)} none="No apps" />`,
  status.keys && html`<${Labels} key="keys" title="Keys" items=${levelLabels(status, set.keys)} />`,
];
