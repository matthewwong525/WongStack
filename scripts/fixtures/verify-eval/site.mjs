// The practice site scripts/eval-verify.mjs checks /verify's instructions against: a small notes
// app whose twelve promises are in change/specs/notes/spec.md. Five are quietly broken, four work,
// and three work in the part a page can show and add a part no page or address can: an email to
// the owner, an audit-log entry, a nightly re-index. The site does none of those three and has no
// address for them. key.json holds the answers. State is in memory, so each start is a fresh site.
// Meta-only: no target receives it. Nothing the site serves may name a planted mistake.
//
// The planted mistakes:
//   1. Saving with no title saves nothing, and shows "Title required", not "Title is required".
//   2. Deleting a note drops the count by one, and removes the note below the chosen one.
//   3. POST /api/notes with no title answers 422 and names the title, and creates a blank note anyway.
//   4. A new note shows in the list as typed once, and without its last character on every load after.
//   5. A search lists the matches, then one note that does not match as the last row.
// One control is slow on purpose: the "Saved" badge appears 800 ms after a save.
import { createServer } from 'node:http';

const SEED = ['Groceries for the week', 'Call the plumber', 'Trip ideas', 'Plumber invoice', 'Book club picks', 'Garden plan'];
const SAVED_DELAY_MS = 800;

const escapeHtml = text => String(text).replace(/[&<>"]/g, char => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' })[char]);

const page = (title, body) => `<!doctype html>
<html lang="en">
<head><meta charset="utf-8"><title>${escapeHtml(title)}</title>
<style>body{font:16px/1.5 system-ui,sans-serif;max-width:40rem;margin:2rem auto;padding:0 1rem}li{margin:.5rem 0}li form{display:inline}label{display:block;margin:.5rem 0}</style>
</head>
<body>
${body}
</body>
</html>`;

const row = note => `<li><span class="title">${escapeHtml(note.title)}</span>
  <a href="/notes/${note.id}/edit" aria-label="Edit ${escapeHtml(note.title)}">Edit</a>
  <form method="post" action="/notes/${note.id}/archive"><button aria-label="Archive ${escapeHtml(note.title)}">Archive</button></form>
  <form method="post" action="/notes/${note.id}/delete"><button aria-label="Delete ${escapeHtml(note.title)}">Delete</button></form></li>`;

const listPage = ({ shown, count, query }) => page('Notes', `<h1>Notes</h1>
<p id="count">${count} notes</p>
<form method="get" action="/"><label>Search <input name="q" value="${escapeHtml(query)}"></label><button>Search</button></form>
<p><a href="/new">New note</a> · <a href="/archived">Archived</a></p>
${query ? `<h2>Results for "${escapeHtml(query)}"</h2>` : ''}
<ul id="notes">
${shown.map(row).join('\n')}
</ul>`);

const newPage = error => page('New note', `<h1>New note</h1>
${error ? `<p role="alert">${escapeHtml(error)}</p>` : ''}
<form method="post" action="/notes">
<label>Title <input name="title"></label>
<label>Body <textarea name="body"></textarea></label>
<button>Save</button>
</form>
<p><a href="/">Back to notes</a></p>`);

const editPage = note => page('Edit note', `<h1>Edit note</h1>
<label>Title <input id="title" value="${escapeHtml(note.title)}"></label>
<button id="save">Save</button> <span id="saved" role="status" hidden>Saved</span>
<p><a href="/">Back to notes</a></p>
<script>
document.getElementById('save').addEventListener('click', async () => {
  const title = document.getElementById('title').value;
  const response = await fetch('/api/notes/${note.id}', { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ title }) });
  if (response.ok) setTimeout(() => { document.getElementById('saved').hidden = false; }, ${SAVED_DELAY_MS});
});
</script>`);

const archivedPage = notes => page('Archived', `<h1>Archived</h1>
<ul id="archived">
${notes.map(note => `<li>${escapeHtml(note.title)}</li>`).join('\n')}
</ul>
<p><a href="/">Back to notes</a></p>`);

async function readBody(req) {
  let text = '';
  for await (const chunk of req) text += chunk;
  return text;
}

function parseJson(text) {
  try {
    const value = JSON.parse(text || '{}');
    return value && typeof value === 'object' ? value : {};
  } catch {
    return {};
  }
}

const titleOf = value => (typeof value === 'string' ? value.trim() : '');
const publicNote = ({ id, title, body }) => ({ id, title, body });

/** Start a fresh site on a free port. Returns `{ url, close }`. */
export async function startSite() {
  let nextId = 1;
  const notes = SEED.map(title => ({ id: nextId++, title, body: '', archived: false }));
  const typed = new Map(); // each new note's title as typed, shown by the next list page only
  const active = () => notes.filter(note => !note.archived);
  const add = (title, body) => {
    const note = { id: nextId++, title, body: typeof body === 'string' ? body : '', archived: false };
    notes.push(note);
    return note;
  };

  const send = (res, status, type, body, headers = {}) => {
    res.writeHead(status, { 'Content-Type': type, 'Cache-Control': 'no-store', ...headers });
    res.end(body);
  };
  const html = (res, body, status = 200) => send(res, status, 'text/html; charset=utf-8', body);
  const json = (res, status, value) => send(res, status, 'application/json', JSON.stringify(value));
  const toList = res => send(res, 303, 'text/plain', 'See /', { Location: '/' });
  const notFound = res => html(res, page('Not found', '<h1>Not found</h1>\n<p><a href="/">Back to notes</a></p>'), 404);

  function list(res, query) {
    const all = active();
    if (query) {
      const matches = note => note.title.toLowerCase().includes(query.toLowerCase());
      return html(res, listPage({ shown: [...all.filter(matches), ...all.filter(note => !matches(note)).slice(0, 1)], count: all.length, query }));
    }
    const shown = all.map(note => ({ ...note, title: typed.get(note.id) ?? note.title }));
    typed.clear();
    html(res, listPage({ shown, count: all.length, query: '' }));
  }

  function create(res, form) {
    const title = titleOf(form.get('title'));
    if (!title) return html(res, newPage('Title required'), 422);
    typed.set(add(title.slice(0, -1), form.get('body')).id, title);
    toList(res);
  }

  // Removes the note below the chosen one in the list, or the one above the last.
  function remove(res, note) {
    const shown = active();
    const at = shown.indexOf(note);
    const gone = (at >= 0 && (shown[at + 1] ?? shown[at - 1])) || note;
    notes.splice(notes.indexOf(gone), 1);
    toList(res);
  }

  function archive(res, note) {
    note.archived = true;
    toList(res);
  }

  function apiCreate(res, body) {
    const title = titleOf(body.title);
    const note = add(title, body.body);
    if (!title) return json(res, 422, { error: 'Title is required' });
    json(res, 201, publicNote(note));
  }

  function apiRename(res, note, body) {
    const title = titleOf(body.title);
    if (!title) return json(res, 422, { error: 'Title is required' });
    note.title = title;
    json(res, 200, publicNote(note));
  }

  async function route(req, res) {
    const { pathname, searchParams } = new URL(req.url, 'http://site');
    const [, id] = pathname.match(/^\/(?:api\/)?notes\/(\d+)(?:\/(?:edit|delete|archive))?$/) ?? [];
    const note = id && notes.find(candidate => candidate.id === Number(id));
    const at = `${req.method} ${id ? pathname.replace(id, ':id') : pathname}`;
    if (id && !note) return pathname.startsWith('/api/') ? json(res, 404, { error: 'No such note' }) : notFound(res);
    switch (at) {
      case 'GET /': return list(res, titleOf(searchParams.get('q')));
      case 'GET /new': return html(res, newPage(''));
      case 'GET /archived': return html(res, archivedPage(notes.filter(candidate => candidate.archived)));
      case 'POST /notes': return create(res, new URLSearchParams(await readBody(req)));
      case 'GET /notes/:id/edit': return html(res, editPage(note));
      case 'POST /notes/:id/delete': return remove(res, note);
      case 'POST /notes/:id/archive': return archive(res, note);
      case 'GET /api/notes': return json(res, 200, { count: active().length, notes: active().map(publicNote) });
      case 'POST /api/notes': return apiCreate(res, parseJson(await readBody(req)));
      case 'PUT /api/notes/:id': return apiRename(res, note, parseJson(await readBody(req)));
      default: return notFound(res);
    }
  }

  const server = createServer((req, res) => route(req, res).catch(() => send(res, 500, 'text/plain', 'Server error')));
  await new Promise(done => server.listen(0, '127.0.0.1', done));
  return {
    url: `http://127.0.0.1:${server.address().port}`,
    close: () => new Promise(done => { server.closeAllConnections(); server.close(done); }),
  };
}
