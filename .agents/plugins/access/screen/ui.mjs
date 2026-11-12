// The small ready-made parts the page is built from: the same class names as the app's own parts, so a project with
// Tailwind draws them the same; access.css draws them by their `data-slot` for a project without it.
import { h, html, render, useEffect, useLayoutEffect, useMemo, useRef, useState } from "./vendor/preact-htm.mjs";

/** The class names given, the empty ones left out. */
export const cn = (...names) => names.filter(Boolean).join(" ");

const BUTTON = "inline-flex shrink-0 items-center justify-center gap-2 rounded-md text-sm font-medium whitespace-nowrap transition-all outline-none focus-visible:border-ring focus-visible:ring-[3px] focus-visible:ring-ring/50 disabled:pointer-events-none disabled:opacity-50 aria-invalid:border-destructive aria-invalid:ring-destructive/20 dark:aria-invalid:ring-destructive/40 [&_svg]:pointer-events-none [&_svg]:shrink-0 [&_svg:not([class*='size-'])]:size-4";
const VARIANT = {
  default: "bg-primary text-primary-foreground hover:bg-primary/90",
  outline: "border bg-background shadow-xs hover:bg-accent hover:text-accent-foreground dark:border-input dark:bg-input/30 dark:hover:bg-input/50",
  ghost: "hover:bg-accent hover:text-accent-foreground dark:hover:bg-accent/50",
};
const SIZE = { default: "h-9 px-4 py-2 has-[>svg]:px-3", sm: "h-8 gap-1.5 rounded-md px-3 has-[>svg]:px-2.5", icon: "size-9" };
/** The classes of a button, for a link drawn as one. */
export const buttonClass = (variant = "default", size = "default", className) => cn(BUTTON, VARIANT[variant], SIZE[size], className);

// `data-slot` comes last, so a part's own mark, such as a popup's way out, never takes the button's look away.
export function Button({ variant = "default", size = "default", class: className, type = "button", children, ...props }) {
  return html`<button type=${type} data-variant=${variant} data-size=${size} class=${buttonClass(variant, size, className)} ...${props} data-slot="button">${children}</button>`;
}

const FIELD = "h-9 w-full min-w-0 rounded-md border border-input bg-transparent px-3 py-1 text-base shadow-xs transition-[color,box-shadow] outline-none selection:bg-primary selection:text-primary-foreground placeholder:text-muted-foreground disabled:pointer-events-none disabled:cursor-not-allowed disabled:opacity-50 md:text-sm dark:bg-input/30 focus-visible:border-ring focus-visible:ring-[3px] focus-visible:ring-ring/50 aria-invalid:border-destructive aria-invalid:ring-destructive/20 dark:aria-invalid:ring-destructive/40";
/** A text field: `onValue` gets each change as typed. */
export function Input({ class: className, onValue, ...props }) {
  return html`<input data-slot="input" class=${cn(FIELD, className)} onInput=${onValue && (event => onValue(event.currentTarget.value))} ...${props} />`;
}

const SELECT = "h-9 w-full min-w-0 appearance-none rounded-md border border-input bg-transparent px-3 py-2 pr-9 text-sm shadow-xs transition-[color,box-shadow] outline-none selection:bg-primary selection:text-primary-foreground placeholder:text-muted-foreground disabled:pointer-events-none disabled:cursor-not-allowed data-[size=sm]:h-8 data-[size=sm]:py-1 dark:bg-input/30 dark:hover:bg-input/50 focus-visible:border-ring focus-visible:ring-[3px] focus-visible:ring-ring/50 aria-invalid:border-destructive aria-invalid:ring-destructive/20 dark:aria-invalid:ring-destructive/40";
/** The device's own picker, with a chevron drawn over its edge. `options` are `[value, words]`. */
export function Select({ options, class: className, ...props }) {
  return html`<div class="group/native-select relative w-fit has-[select:disabled]:opacity-50" data-slot="native-select-wrapper">
    <select data-slot="native-select" class=${cn(SELECT, className)} ...${props}>
      ${options.map(([value, words]) => html`<option key=${value} value=${value} data-slot="native-select-option" class="bg-[Canvas] text-[CanvasText]">${words}</option>`)}
    </select>
    <svg aria-hidden="true" data-slot="native-select-icon" class="pointer-events-none absolute top-1/2 right-3.5 size-4 -translate-y-1/2 text-muted-foreground opacity-50 select-none" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="m6 9 6 6 6-6" /></svg>
  </div>`;
}

const BADGE = "inline-flex w-fit shrink-0 items-center justify-center gap-1 overflow-hidden rounded-full border border-transparent px-2 py-0.5 text-xs font-medium whitespace-nowrap transition-[color,box-shadow] focus-visible:border-ring focus-visible:ring-[3px] focus-visible:ring-ring/50 [&>svg]:pointer-events-none [&>svg]:size-3";
const BADGE_VARIANT = { secondary: "bg-secondary text-secondary-foreground", outline: "border-border text-foreground" };
export const Badge = ({ variant = "outline", class: className, children }) =>
  html`<span data-slot="badge" data-variant=${variant} class=${cn(BADGE, BADGE_VARIANT[variant], className)}>${children}</span>`;

/** A notice's box. It says nothing aloud unless `role` makes it a status or an alert. */
export const Alert = ({ role, children }) => html`<div data-slot="alert" role=${role} class="relative grid w-full grid-cols-[0_1fr] items-start gap-y-0.5 rounded-lg border px-4 py-3 text-sm has-[>svg]:grid-cols-[calc(var(--spacing)*4)_1fr] has-[>svg]:gap-x-3 [&>svg]:size-4 [&>svg]:translate-y-0.5 [&>svg]:text-current bg-card text-card-foreground">
  <div data-slot="alert-description" class="col-start-2 grid justify-items-start gap-1 text-sm [&_p]:leading-relaxed w-full gap-2 text-foreground wrap-anywhere">${children}</div>
</div>`;

export const Card = ({ class: className, children }) => html`<div data-slot="card" class=${cn("flex flex-col gap-6 rounded-xl border bg-card py-6 text-card-foreground shadow-sm", className)}>${children}</div>`;
export const Skeleton = ({ class: className }) => html`<div data-slot="skeleton" class=${cn("animate-pulse rounded-md bg-accent", className)}></div>`;
export const LABEL = "flex items-center gap-2 text-sm leading-none font-medium select-none group-data-[disabled=true]:pointer-events-none group-data-[disabled=true]:opacity-50 peer-disabled:cursor-not-allowed peer-disabled:opacity-50";
export const Label = ({ class: className, children }) => html`<label data-slot="label" class=${cn(LABEL, className)}>${children}</label>`;
export const Textarea = ({ class: className, ...props }) => html`<textarea data-slot="textarea" class=${cn("flex field-sizing-content min-h-16 w-full rounded-md border border-input bg-transparent px-3 py-2 text-base shadow-xs transition-[color,box-shadow] outline-none placeholder:text-muted-foreground focus-visible:border-ring focus-visible:ring-[3px] focus-visible:ring-ring/50 disabled:cursor-not-allowed disabled:opacity-50 md:text-sm dark:bg-input/30", className)} ...${props}></textarea>`;

// The table parts: a row divided from the next by a line, a cell on one line.
export const TABLE = {
  header: "[&_tr]:border-b", body: "[&_tr:last-child]:border-0",
  row: "border-b transition-colors hover:bg-muted/50 has-aria-expanded:bg-muted/50 data-[state=selected]:bg-muted",
  head: "h-10 px-2 text-left align-middle font-medium whitespace-nowrap text-foreground",
  cell: "p-2 align-middle whitespace-nowrap",
};

// The layers open now, the top one last: Escape answers only the top one.
const layers = [];
const escape = event => { if (event.key === "Escape" && layers.length) layers.at(-1).current(event); };
/** While drawn, Escape calls `onEscape`, unless a layer opened after it is on top. */
export function useEscape(onEscape) {
  const latest = useRef(onEscape);
  latest.current = onEscape;
  // Taken at once as the layer draws: an Escape pressed right after it opens is its own.
  useLayoutEffect(() => {
    if (!layers.length) document.addEventListener("keydown", escape);
    layers.push(latest);
    return () => {
      layers.splice(layers.indexOf(latest), 1);
      if (!layers.length) document.removeEventListener("keydown", escape);
    };
  }, []);
}

// Hands the context of where a layer is drawn to what it holds, though it is drawn at the end of the page.
function Carry(props) {
  this.getChildContext = () => props.context;
  return props.children;
}

/** Draws `children` at the end of the page, over it. A `modal` layer hides the rest of the page from a screen
 *  reader and the keyboard until it closes. */
export function Layer({ modal = false, children }, context) {
  const host = useMemo(() => document.createElement("div"), []);
  useLayoutEffect(() => {
    host.setAttribute("data-access-layer", "");
    document.body.append(host);
    const hidden = modal ? [...document.body.children].filter(item => item !== host && !item.hasAttribute("aria-hidden")) : [];
    for (const item of hidden) { item.setAttribute("aria-hidden", "true"); item.inert = true; }
    return () => {
      for (const item of hidden) { item.removeAttribute("aria-hidden"); item.inert = false; }
      render(null, host);
      host.remove();
    };
  }, []);
  useLayoutEffect(() => { render(h(Carry, { context }, children), host); });
  return null;
}

// What the keyboard can reach inside a part.
const REACHABLE = "a[href], button:not([disabled]), input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex='-1'])";

/** A question in a popup over a dimmed page: `cancel` is focused first and is Escape's answer too; a click on the
 *  dimmed page answers nothing; Tab stays inside. The keyboard goes back where it was once it closes. */
export function Dialog({ title, description, onEscape, footer, class: className, children }) {
  const box = useRef(null);
  const id = useMemo(() => `access-dialog-${Math.random().toString(36).slice(2)}`, []);
  const [from] = useState(() => document.activeElement);
  useEscape(event => { event.preventDefault(); onEscape(); });
  useLayoutEffect(() => {
    box.current.querySelector("[data-dialog='cancel']")?.focus();
    return () => from?.focus?.();
  }, []);
  const trap = event => {
    if (event.key !== "Tab") return;
    const reach = [...box.current.querySelectorAll(REACHABLE)];
    const [first, last] = [reach[0], reach.at(-1)];
    if (event.shiftKey ? document.activeElement === first : document.activeElement === last) { event.preventDefault(); (event.shiftKey ? last : first)?.focus(); }
  };
  return html`<${Layer} modal>
    <div data-slot="alert-dialog-overlay" class="fixed inset-0 z-50 bg-black/50"></div>
    <div ref=${box} role="alertdialog" aria-modal="true" aria-labelledby=${`${id}-title`} aria-describedby=${`${id}-description`} data-slot="alert-dialog-content" data-size="default" onKeyDown=${trap}
      class=${cn("group/alert-dialog-content fixed top-[50%] left-[50%] z-50 grid w-full max-w-[calc(100%-2rem)] translate-x-[-50%] translate-y-[-50%] gap-4 rounded-lg border bg-background p-6 shadow-lg duration-200 data-[size=default]:sm:max-w-lg", className)}>
      <div data-slot="alert-dialog-header" class="grid grid-rows-[auto_1fr] place-items-center gap-1.5 text-center sm:group-data-[size=default]/alert-dialog-content:place-items-start sm:group-data-[size=default]/alert-dialog-content:text-left">
        <h2 id=${`${id}-title`} data-slot="alert-dialog-title" class="text-lg font-semibold">${title}</h2>
        <div id=${`${id}-description`} data-slot="alert-dialog-description" class="text-sm text-muted-foreground">${description}</div>
      </div>
      ${children}
      <div data-slot="alert-dialog-footer" class="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">${footer}</div>
    </div>
  <//>`;
}

/** A row's `{ label, onSelect, disabled }` items behind `⋯`. Arrows move in it; Escape, a pick or a press anywhere
 *  else closes it, and the keyboard goes back to the dots. It holds neither the keyboard nor the page. */
export function RowMenu({ label, items }) {
  const [open, setOpen] = useState(false);
  const [first, setFirst] = useState(false);
  const trigger = useRef(null);
  const menu = useRef(null);
  const close = () => { setOpen(false); trigger.current?.focus(); };
  const show = (focusFirst) => { setFirst(focusFirst); setOpen(true); };
  return html`<div class="relative inline-block">
    <button ref=${trigger} type="button" data-slot="button" data-variant="outline" data-size="icon" class=${buttonClass("outline", "icon")} aria-label=${label}
      aria-haspopup="menu" aria-expanded=${open ? "true" : "false"} onClick=${() => (open ? close() : show(false))}
      onKeyDown=${event => { if (["Enter", " ", "ArrowDown"].includes(event.key)) { event.preventDefault(); show(true); } }}><span aria-hidden="true">⋯</span></button>
    ${open && html`<${Menu} menu=${menu} trigger=${trigger} items=${items} first=${first} close=${close} />`}
  </div>`;
}

function Menu({ menu, trigger, items, first, close }) {
  useEscape(close);
  useLayoutEffect(() => { if (first) menu.current.querySelector("[role='menuitem']:not([aria-disabled='true'])")?.focus(); }, []);
  useEffect(() => {
    // A press anywhere else closes it, from a moment after it opens.
    const outside = event => { if (!menu.current?.contains(event.target) && !trigger.current?.contains(event.target)) close(); };
    const timer = setTimeout(() => document.addEventListener("pointerdown", outside));
    return () => { clearTimeout(timer); document.removeEventListener("pointerdown", outside); };
  }, []);
  const move = event => {
    const all = [...menu.current.querySelectorAll("[role='menuitem']:not([aria-disabled='true'])")];
    const step = { ArrowDown: 1, ArrowUp: -1 }[event.key];
    if (!step) return;
    event.preventDefault();
    all[(all.indexOf(document.activeElement) + step + all.length) % all.length]?.focus();
  };
  return html`<div ref=${menu} role="menu" aria-orientation="vertical" data-slot="dropdown-menu-content" onKeyDown=${move}
    class="absolute right-0 z-50 mt-1 min-w-[8rem] overflow-x-hidden overflow-y-auto rounded-md border bg-popover p-1 text-popover-foreground shadow-md">
    ${items.map(item => html`<div key=${item.label} role="menuitem" tabindex="-1" data-slot="dropdown-menu-item" aria-disabled=${item.disabled ? "true" : undefined}
      class="relative flex cursor-default items-center gap-2 rounded-sm px-2 py-1.5 text-sm outline-hidden select-none focus:bg-accent focus:text-accent-foreground aria-disabled:pointer-events-none aria-disabled:opacity-50"
      onClick=${() => { if (item.disabled) return; close(); item.onSelect(); }}
      onKeyDown=${event => { if ((event.key === "Enter" || event.key === " ") && !item.disabled) { event.preventDefault(); close(); item.onSelect(); } }}>${item.label}</div>`)}
  </div>`;
}
