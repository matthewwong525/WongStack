import { html, useEffect, useLayoutEffect, useRef, useState } from "./vendor/preact-htm.mjs";
import { Confirm } from "./confirm.mjs";
import { useHold, useWhere } from "./router.mjs";
import { Button, useEscape } from "./ui.mjs";

// What answers a press itself, on the page beside an open panel, and what is drawn over it.
const OWN = "a, button, select, tr, [role='menu'], [data-access-layer]";
let made = 0;

const Leave = ({ onLeave, onStay }) => html`<${Confirm} title="Leave without saving?" action="Leave" cancel="Keep editing" pending=${false} onConfirm=${onLeave} onCancel=${onStay}>
  Your changes here are not saved yet.
<//>`;

/** One person or role in a panel beside its list, which stays in use. Closing goes back to the view's address. With
 *  `changed`, every way out asks: a link, the panel's own ways out, Back, a reload. A save passes. */
export function Page({ name, changed, action, onSave, extra, children, ...props }) {
  const { view, pending } = props;
  const { go } = useWhere();
  const panel = useRef(null);
  const [title] = useState(() => `access-panel-${++made}`);
  // Where the owner was going when the panel asked.
  const [leaving, setLeaving] = useState(null);
  useHold(to => { if (!changed) return false; setLeaving(to); return true; });
  // A reload or a closed tab asks through the browser's own question, from the moment the change is drawn.
  useLayoutEffect(() => {
    const ask = event => { if (changed) event.preventDefault(); };
    window.addEventListener("beforeunload", ask);
    return () => window.removeEventListener("beforeunload", ask);
  }, [changed]);
  const close = () => go(view.home);
  const latest = useRef(close);
  latest.current = close;
  useEscape(() => latest.current());
  // The keyboard goes to the panel as it opens, to its first field where it has one.
  useLayoutEffect(() => { (panel.current.querySelector("[autofocus]") ?? panel.current).focus(); }, []);
  useEffect(() => {
    // The keyboard moving to the page beside the panel closes nothing: only a press there does, from a moment after it
    // opens. A press on a link, a control or a row there is that thing's own to answer.
    const outside = event => { if (!panel.current?.contains(event.target) && !event.target.closest?.(OWN)) latest.current(); };
    const timer = setTimeout(() => document.addEventListener("pointerdown", outside));
    return () => { clearTimeout(timer); document.removeEventListener("pointerdown", outside); };
  }, []);
  return html`<div ref=${panel} role="dialog" aria-labelledby=${title} tabindex="-1" data-slot="sheet-content" data-state="open"
    class="fixed z-50 flex flex-col bg-background shadow-lg transition ease-in-out inset-y-0 right-0 h-full border-l w-full gap-0 sm:top-14 sm:h-auto sm:max-w-md">
    ${leaving && html`<${Leave} onLeave=${() => go(leaving, { pass: true })} onStay=${() => setLeaving(null)} />`}
    <div data-slot="sheet-header" class="flex flex-col gap-1.5 p-4 pe-12"><h2 id=${title} data-slot="sheet-title" class="font-semibold text-foreground wrap-anywhere">${name}</h2></div>
    <form class="flex min-h-0 flex-1 flex-col" onSubmit=${event => { event.preventDefault(); onSave?.(); }}>
      <fieldset class="flex min-h-0 min-w-0 flex-1 flex-col" disabled=${pending}>
        <div class="grid min-h-0 flex-1 content-start gap-4 overflow-y-auto px-4 pb-4">${children}</div>
        <div data-slot="sheet-footer" class="mt-auto flex p-4 flex-row flex-wrap gap-2.5 border-t">
          ${changed && html`<p class="basis-full text-sm font-semibold">Not saved yet</p>`}
          ${action && html`<${Button} type="submit">${action}<//>`}
          <${Button} variant="outline" onClick=${close}>${action ? "Cancel" : "Close"}<//>
          ${extra}
        </div>
      </fieldset>
    </form>
    <button type="button" data-slot="sheet-close" onClick=${close} class="absolute top-4 right-4 rounded-xs opacity-70 ring-offset-background transition-opacity hover:opacity-100 focus:ring-2 focus:ring-ring focus:ring-offset-2 focus:outline-hidden disabled:pointer-events-none">
      <svg aria-hidden="true" class="size-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M18 6 6 18M6 6l12 12" /></svg>
      <span class="sr-only">Close</span>
    </button>
  </div>`;
}
