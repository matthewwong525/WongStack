import { html, useState } from "./vendor/preact-htm.mjs";
import { Confirm } from "./confirm.mjs";
import { useScreen } from "./context.mjs";
import { Field } from "./fields.mjs";
import { keyRows } from "./levels.mjs";
import { Cell, Name, Row, Table } from "./table.mjs";
import { Button, Input } from "./ui.mjs";
import { View } from "./view.mjs";

/** The quiet lines under a key's state: muted, each on its own line. A tool added from a chat names what Read lets
 *  someone do with it, before anyone is given it. */
const notes = (key, live) => [key.direct && "also used directly",
  key.chat && `Added in a chat · reads: ${["GET anything", ...key.reads ?? []].join(", ")}`, !key.saved && !key.waiting &&
  (!live && key.liveOnly ? "Live app only" : key.setup ? "Ask the assistant to finish Access setup"
    : `Ask the assistant to connect it${live ? ", or paste the key" : ""}`)]
  .filter(note => typeof note === "string");

const state = key => (key.waiting ? `Waiting for the next publish, ends in …${key.waiting.ends}` : key.saved ? "Saved" : "Not saved");

/** A key's paste box: one hidden field per part, sealed on this page before it is sent. Nobody sees it again. */
function PasteKey({ item, parts, sent }) {
  const { api } = useScreen();
  const [open, setOpen] = useState(false);
  const [values, setValues] = useState([]);
  const [pending, setPending] = useState(false);
  const [failed, setFailed] = useState("");
  const close = () => { setOpen(false); setValues([]); setFailed(""); };
  const save = async () => {
    const pasted = parts.map((_, at) => (values[at] ?? "").trim());
    if (pasted.some(value => !value)) return setFailed("Paste the key first.");
    setPending(true);
    try { await api.sendKey(item.id, pasted); close(); sent(); } catch (error) { setFailed(error.message); }
    setPending(false);
  };
  const replace = item.saved || item.waiting;
  const field = (label, at) => html`<${Input} type="password" autocomplete="off" aria-label=${label} placeholder="Paste it here"
    value=${values[at] ?? ""} onValue=${value => setValues(current => Object.assign([...current], { [at]: value }))} />`;
  return [
    html`<${Button} key="open" variant="outline" size="sm" onClick=${() => setOpen(true)}>${replace ? "Replace key" : "Paste key"}<//>`,
    open && html`<${Confirm} key="ask" title=${`${replace ? "Replace" : "Paste"} the ${item.title} key`} action="Save key" pending=${pending} onCancel=${close} onConfirm=${() => void save()}>
      <span class="block">It is locked on this page, and only the next publish can open it. Nobody can see it again, you included.</span>
      ${parts.map((label, at) => html`<span key=${label} class="mt-3 block">${parts.length > 1 ? html`<${Field} label=${label}>${field(label, at)}<//>` : field(`${item.title} key`, at)}</span>`)}
      ${failed && html`<span role="alert" class="mt-3 block text-destructive">${failed}</span>`}
    <//>`,
  ];
}

/** Where a key is pasted: a button on the live app, or on a preview a line saying only the live app takes one. */
const pasteCell = (key, environment, sent) => (!key.parts?.length ? null
  : environment === "live" ? html`<${PasteKey} item=${key} parts=${key.parts} sent=${sent} />` : html`<span class="text-muted-foreground">Live app only</span>`);

/** The owner's and an Admin's third view: every key, what it is for and whether it is saved or waits for the next
 *  publish, never its value or a level, and a place to paste a key. Levels are set where a person or role is opened. */
export function Services(props) {
  const keys = keyRows(props.status.keys);
  const live = props.status.environment === "live";
  return html`<${View} ...${props}>
    ${keys.length ? html`<${Table} view=${props.view} columns=${["Key", "For", "State"]} actions="Paste a key">${keys.map(key => html`<${Row} key=${key.id}>
      <${Name} title=${key.title} class="min-w-36" />
      <${Cell}>${key.purpose}${key.docs && [" · ", html`<a href=${key.docs} target="_blank" rel="noreferrer">API guide</a>`]}<//>
      <${Cell}>${state(key)}${notes(key, live).map(note => html`<span key=${note} class="block text-muted-foreground">${note}</span>`)}<//>
      <${Cell} actions>${pasteCell(key, props.status.environment, props.reload)}<//>
    <//>`)}<//>`
      : html`<p>No keys yet. Ask the assistant to connect a service.</p>`}
  <//>`;
}
