// The private form's script (see hand-over.mjs `open --form` and form.mjs). It draws the form
// `GET /form` describes: the title, the note under it, one labelled box per field with its autofill
// name, a dropdown for a field with choices, an expiry month and year side by side, a line saying what
// sending does, and one button carrying the site's own label. Every string is set as text. The time
// left counts down in whole minutes to `closesAt`, on the watcher's clock, and the page closes at the
// limit.
//
// The button posts the boxes once, in order, to `/send`; the page never shows the site. The reply's
// receipt ends the page on *Sent* or *Not accepted*, with the boxes emptied. A reply that never arrives
// is looked up at `/receipt` until the link says how it went or stops answering. *Close without
// sending* cancels through `/done`. `timeLeft`, `rowsOf`, and `ending` are exported for tests.

const ENDINGS = {
  done: { title: 'Sent', hint: 'Back to your chat.' },
  'not-accepted': { title: 'Not accepted', hint: 'The site kept its page, and nothing is sent again. Back to your chat.' },
  closed: { title: 'This link has closed', hint: 'Ask your assistant for a new one.' },
  unknown: { title: 'This link has closed', hint: 'Back to your chat to see how it went.' },
};
const RECEIPT_EVERY_MS = 500;
const VALUE_LIMIT = 256;

/** `Closes in N min`, in whole minutes rounded up, or null once `closesAt` has passed. */
export function timeLeft(closesAt, now) {
  return closesAt > now ? `Closes in ${Math.ceil((closesAt - now) / 60_000)} min` : null;
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

/** The closing screen for a receipt: a send with no receipt says to look in the chat. */
export function ending(receipt) {
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
    $('#does').textContent = `${submit} types these into the site and presses its button, once. Your assistant never sees them.`;
    lock(false);
  }

  /**
   * Counts down on the watcher's clock, since this device's may be off, and closes the page at the
   * limit. A send under way outlasts the limit: its own answer ends the page.
   */
  function countdown(closesAt, serverNow) {
    const ahead = serverNow - Date.now();
    const tick = () => {
      if (!$('#ended').hidden) return;
      const now = Date.now() + ahead;
      const text = timeLeft(closesAt, now);
      if (!text && !sending) return end(ENDINGS.closed);
      $('#time').textContent = text ?? '';
      setTimeout(tick, text ? Math.min(closesAt - now, 5000) : 1000);
    };
    tick();
  }

  /** How a send went when its reply never arrived: the receipt, once the link has one, or null when it stops answering. */
  async function lookUp() {
    for (;;) {
      const response = await call('receipt');
      if (response?.status === 200) return response.json().catch(() => null);
      if (response?.status !== 202) return null;
      await new Promise(done => setTimeout(done, RECEIPT_EVERY_MS));
    }
  }

  $('#details').addEventListener('submit', async event => {
    event.preventDefault();
    if (sending) return;
    if (!$('#details').checkValidity()) return void $('#details').reportValidity();
    sending = true;
    const values = controls.map(control => control.value);
    lock(true);
    status('Sending…');
    const response = await call('send', { values });
    if (response?.status === 400) {
      sending = false;
      lock(false);
      return status('Check each box and try again.');
    }
    const receipt = response?.ok ? (await response.json().catch(() => null))?.receipt : await lookUp();
    end(ending(receipt));
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
    const { closesAt, now, ...view } = await response.json();
    draw(view);
    if (closesAt) countdown(closesAt, now ?? Date.now());
    controls[0]?.focus();
  })();
}

if (typeof document !== 'undefined') start();
