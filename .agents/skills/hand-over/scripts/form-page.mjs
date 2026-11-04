// The private form's script (see hand-over.mjs `open --form` and form.mjs), after picture-view.mjs; it sets every
// string as text. Where the link can show the site live, the press sends this page to its view page, under live/.

const ENDINGS = {
  done: { title: 'Sent', hint: 'Back to your chat.' },
  'not-accepted': { title: 'Not sent', hint: 'A box could not be filled, so nothing was pressed. Back to your chat.' },
  closed: { title: 'This link has closed', hint: 'Ask your assistant for a new one.' },
  unknown: { title: 'This link has closed', hint: 'Back to your chat to see how it went.' },
};
const RECEIPT_EVERY_MS = 500;
const VALUE_LIMIT = 256;
const SOON_MS = 10 * 60_000;
const LATE_S = 60;

/** `Open until <time>` on this device's clock, `ahead` of it being the watcher's, and ` tomorrow` or the weekday past
 * today, while over ten minutes remain; then `Closes in N min`, rounded up; null once `closesAt` has passed. */
export function timeLeft(closesAt, now, { ahead = 0, zone } = {}) {
  if (closesAt <= now) return null;
  if (closesAt - now <= SOON_MS) return `Closes in ${Math.ceil((closesAt - now) / 60_000)} min`;
  const at = new Date(closesAt - ahead);
  const day = time => Date.parse(new Date(time).toLocaleDateString('en-CA', { timeZone: zone }));
  const days = Math.round((day(at) - day(now - ahead)) / 86_400_000);
  const when = days === 1 ? ' tomorrow' : days > 1 ? ` ${at.toLocaleDateString([], { weekday: 'long', timeZone: zone })}` : '';
  return `Open until ${at.toLocaleTimeString([], { hour: 'numeric', minute: '2-digit', timeZone: zone })}${when}`;
}

/** The fields as rows of indexes: an expiry year right after its month shares the month's row. */
export function rowsOf(fields) {
  const rows = [];
  fields.forEach((field, index) => {
    if (field.autocomplete === 'cc-exp-year' && fields[index - 1]?.autocomplete === 'cc-exp-month') rows.at(-1).push(index);
    else rows.push([index]);
  });
  return rows;
}

/** The status line for the step a send is on, named by `/receipt`; the press names the site's own button. From the
 * press, `seconds` counts up beside the site's name, and after a minute says not to pay again. */
export function stepText(step, submit, { site = 'The site', seconds } = {}) {
  if (step === 'pressing' || step === 'waiting') {
    if (seconds >= LATE_S) return `${site} hasn't finished. Don't pay again unless it shows an error.`;
    if (seconds >= 0) return `Paying ${site} · ${seconds} s`;
  }
  return { typing: 'Typing your details…', pressing: `Pressing ${submit}…`, waiting: 'Waiting for the site…' }[step] ?? 'Sending…';
}

/** The closing screen for a receipt: a send with no receipt says to look in the chat. */
export function ending(receipt, site = 'The site') {
  if (receipt?.reason === 'page-changed') return { title: `${site}'s page changed. Nothing was sent.`, hint: 'Your chat will send you a new form.' };
  if (receipt?.result === 'unconfirmed') return { title: `${site} hasn't finished`, hint: 'Don\'t pay again unless it shows an error. Your chat will say how it went.' };
  if (receipt?.result === 'done' && receipt.notification !== 'notified') return { ...ENDINGS.done, hint: 'Back to your chat, and say continue.' };
  return ENDINGS[receipt?.result] ?? (receipt ? ENDINGS.closed : ENDINGS.unknown);
}

function start() {
  const $ = selector => document.querySelector(selector);
  const make = (tag, props) => Object.assign(document.createElement(tag), props);
  const key = new URLSearchParams(location.hash.slice(1)).get('key') ?? '';
  history.replaceState(null, '', location.pathname);
  const controls = [];
  let sending = false;
  let leaving = false;
  let label = '';
  let site;

  const status = text => { $('#status').textContent = text ?? ''; };
  const call = (path, body) => fetch(path, {
    method: body ? 'POST' : 'GET',
    cache: 'no-store',
    headers: { 'x-hand-over-key': key, ...(body && { 'content-type': 'application/json' }) },
    body: body && JSON.stringify(body),
  }).catch(() => null);
  const lock = on => { for (const control of [...controls, $('#send'), $('#done')]) control.disabled = on; };
  const end = ({ title, hint }) => {
    for (const control of controls) control.value = '';
    $('#picture').replaceChildren();
    status();
    $('#ended h1').textContent = title;
    $('#ended .hint').textContent = hint;
    $('#ended').hidden = false;
    $('#form').hidden = true;
  };

  /** One labelled box: a dropdown when the field has choices, else a text box of the field's type. */
  function box(field, index) {
    const id = `field-${index}`;
    const control = field.options ? make('select', { id }) : make('input', { id, type: field.type, maxLength: VALUE_LIMIT, spellcheck: false });
    control.name = field.autocomplete || id;
    control.required = true;
    for (const [name, value] of [['autocomplete', field.autocomplete || 'off'], ['inputmode', field.inputmode], ['autocapitalize', 'off'], ['autocorrect', 'off']]) if (value) control.setAttribute(name, value);
    if (field.options) control.append(new Option('Choose…', ''), ...field.options.map(option => new Option(option.text, option.value)));
    controls.push(control);
    const wrap = make('div', { className: 'box' });
    wrap.append(make('label', { htmlFor: id, textContent: field.label }), control);
    return wrap;
  }

  function draw({ title, note, fields, submit }) {
    document.title = title;
    $('#form h1').textContent = title;
    $('#note').textContent = note ?? '';
    $('#note').hidden = !note;
    $('#fields').replaceChildren(...rowsOf(fields).map(row => {
      const line = make('div', { className: 'row' });
      line.append(...row.map(index => box(fields[index], index)));
      return line;
    }));
    $('#send').textContent = submit;
    $('#does').textContent = `${submit} types these into the site and presses its button, once.`;
    label = submit;
    lock(false);
  }

  /** Counts down on the watcher's clock, since this device's may be off, and closes the page at the
   * limit. A send under way outlasts the limit: its own answer ends the page. */
  function countdown(closesAt, serverNow) {
    const ahead = serverNow - Date.now();
    const tick = () => {
      if (!$('#ended').hidden) return;
      const now = Date.now() + ahead;
      const text = timeLeft(closesAt, now, { ahead });
      if (!text && !sending) return end(ENDINGS.closed);
      $('#time').textContent = text ?? '';
      setTimeout(tick, text ? Math.min(closesAt - now, 5000) : 1000);
    };
    tick();
  }

  /** How a send went when its reply never came: the receipt once the link has one, or null when it stops answering. */
  async function lookUp() {
    for (;;) {
      const response = await call('receipt');
      if (response?.status === 200) return response.json().catch(() => null);
      if (response?.status !== 202) return null;
      await new Promise(done => setTimeout(done, RECEIPT_EVERY_MS));
    }
  }

  /** Shows the step the send is on, asking `/receipt` every half second until `answered()`; at a press shown live,
   * goes to the view page, with the key. */
  async function follow(answered) {
    for (;;) {
      await new Promise(done => setTimeout(done, RECEIPT_EVERY_MS));
      if (answered()) return;
      const response = await call('receipt');
      const { step, since, now } = (response?.status === 202 && (await response.json().catch(() => null))) || {};
      if (answered() || !step) continue;
      if (step === 'viewing') {
        leaving = true;
        return location.replace(`live/#${new URLSearchParams({ key })}`);
      }
      status(stepText(step, label, { site, seconds: since ? Math.floor((now - since) / 1000) : undefined }));
    }
  }

  $('#details').addEventListener('submit', async event => {
    event.preventDefault();
    if (sending) return;
    if (!$('#details').checkValidity()) return void $('#details').reportValidity();
    sending = true;
    const values = controls.map(control => control.value);
    lock(true);
    status(stepText(null, label));
    let answered = false;
    follow(() => answered);
    const response = await call('send', { values });
    answered = true;
    if (response?.status === 400) {
      sending = false;
      lock(false);
      return status('Check each box and try again.');
    }
    if (leaving) return;
    const receipt = response?.ok ? (await response.json().catch(() => null))?.receipt : await lookUp();
    if (!leaving) end(ending(receipt, site));
  });

  $('#done').addEventListener('click', async () => {
    if (sending) return;
    lock(true);
    await call('done', {});
    end(ENDINGS.closed);
  });

  (async () => {
    if (!key) return end(ENDINGS.closed);
    const response = await call('form');
    if (!response?.ok) return end(ENDINGS.closed);
    const { closesAt, now, picture, changed, ...view } = await response.json();
    site = view.site;
    if (changed) return end(ending({ result: 'not-accepted', reason: 'page-changed' }, site));
    draw(view);
    if (closesAt) countdown(closesAt, now ?? Date.now());
    controls[0]?.focus();
    if (picture) await showPicture();
  })();

  /** Fetches the picture behind the key and shows it above the boxes; none when it does not load. */
  async function showPicture() {
    const response = await call('picture');
    const blob = response?.ok && (await response.blob().catch(() => null));
    if (blob && $('#ended').hidden) globalThis.pictureView($('#picture'), URL.createObjectURL(blob), 'The site\'s page. Tap to zoom.');
  }
}

if (typeof document !== 'undefined') start();
