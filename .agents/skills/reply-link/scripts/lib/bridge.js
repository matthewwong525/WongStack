// The page bridge, first in a page's <head> in the inbox copy: alive, send (with FormData files) and act over the port,
// and window.replyMedia(name). Doc: wiki/development/reply-link-pages.md#the-page-bridge
(function () {
  if (window.parent === window) return;
  window.REPLY_KEY = 'inbox';
  // The review kit's status map: a tap's state in the inbox, as the status a tunnel would answer.
  var CODES = { sent: 200, changed: 409, done: 409, gone: 409, soon: 429, closed: 410, expired: 410 };
  var HELLO_MS = 10000;
  var hello = null, port = null, reply = null, waiting = [], asked = {}, refs = 0;
  window.addEventListener('message', function (e) {
    var m = e.data;
    if (port || e.source !== window.parent || !e.ports || !e.ports[0] || !m || m.type !== 'inbox:hello'
      || typeof m.version !== 'string' || !Array.isArray(m.actions)) return;
    hello = m;
    port = e.ports[0];
    port.onmessage = function (ev) {
      var d = ev.data;
      if (d && (d.type === 'inbox:file-result' || d.type === 'inbox:media-result') && asked[d.ref]) {
        var heard = asked[d.ref]; delete asked[d.ref]; heard(d); return;
      }
      if (!d || d.type !== 'inbox:result' || !reply) return;
      var done = reply; reply = null; done(d.state);
    };
    waiting.splice(0).forEach(function (go) { go(); });
  });
  function greeted() {
    if (hello) return Promise.resolve();
    return new Promise(function (resolve, reject) {
      var timer = setTimeout(function () { reject(new TypeError('Failed to fetch')); }, HELLO_MS);
      waiting.push(function () { clearTimeout(timer); resolve(); });
    });
  }
  function answer(status, body) {
    return { ok: status >= 200 && status < 300, status: status, json: function () { return Promise.resolve(body); },
      text: function () { return Promise.resolve(JSON.stringify(body)); } };
  }
  function bodyOf(init) {
    try { var body = JSON.parse(init && typeof init.body === 'string' ? init.body : 'null'); return body && typeof body === 'object' ? body : {}; } catch { return {}; }
  }
  // One ask of the inbox, answered by its ref.
  function ask(message, moved) {
    return new Promise(function (resolve) {
      message.ref = 'r' + (++refs);
      asked[message.ref] = resolve;
      port.postMessage(message, moved || []);
    });
  }
  function tap(action, text, files) {
    // One tap at a time, as a tunnel paces a page's sends.
    if (reply) return Promise.resolve(answer(429, { sent: false }));
    return new Promise(function (resolve) {
      reply = function (state) {
        var status = Object.prototype.hasOwnProperty.call(CODES, state) ? CODES[state] : 502;
        var said = status === 200 ? { sent: true } : state === 'changed' || state === 'done' || state === 'gone' ? { [state]: true }
          : status === 410 ? { closed: true } : { sent: false };
        resolve(answer(status, said));
      };
      var message = { type: 'inbox:tap', action: action, text: typeof text === 'string' ? text : '' };
      if (files && files.length) message.files = files;
      port.postMessage(message);
    });
  }
  function bytesOf(file) {
    if (file.arrayBuffer) return file.arrayBuffer();
    return new Promise(function (resolve, reject) {
      var reader = new FileReader();
      reader.onload = function () { resolve(reader.result); };
      reader.onerror = reject;
      reader.readAsArrayBuffer(file);
    });
  }
  // A send whose FormData holds a text and files: each file goes to the inbox first, then the tap names them all.
  function sendForm(form) {
    if (reply) return Promise.resolve(answer(429, { sent: false }));
    var question = String(form.get('question') || 'A file from the page');
    var ids = [];
    return form.getAll('file').reduce(function (before, file) {
      return before.then(function (refused) {
        if (refused || typeof file === 'string') return refused;
        return bytesOf(file).then(function (data) {
          return ask({ type: 'inbox:file', name: file.name || 'file', question: question, data: data }, [data]);
        }).then(function (d) {
          if (d.id) { ids.push(d.id); return null; }
          return answer(413, { sent: false, error: d.error || 'The inbox did not take the file.' });
        });
      });
    }, Promise.resolve(null)).then(function (refused) { return refused || tap('send', String(form.get('text') || ''), ids); });
  }
  window.replyMedia = function (name) {
    return greeted().then(function () { return ask({ type: 'inbox:media', name: String(name) }); })
      .then(function (d) { return d.blob || null; }, function () { return null; });
  };
  var ROUTES = {
    alive: function () {
      return hello.readOnly === true ? answer(410, { closed: true }) : answer(200, { closesAt: null, actions: hello.actions, version: hello.version });
    },
    send: function (body) {
      if (hello.readOnly === true) return answer(410, { closed: true });
      return typeof FormData !== 'undefined' && body instanceof FormData ? sendForm(body) : tap('send', body.text);
    },
    act: function (body) { return hello.readOnly === true ? answer(410, { closed: true }) : tap(body.action, body.text); },
  };
  var real = window.fetch;
  window.fetch = function (input, init) {
    var name = typeof input === 'string' ? input.replace(/^\.\//, '') : '';
    if (!Object.prototype.hasOwnProperty.call(ROUTES, name)) return real.apply(this, arguments);
    var body = typeof FormData !== 'undefined' && init && init.body instanceof FormData ? init.body : bodyOf(init);
    return greeted().then(function () { return ROUTES[name](body); });
  };
  // A link opens its own tab and a # link scrolls in place: a srcdoc page resolves #x against the inbox's address.
  document.addEventListener('click', function (e) {
    var a = e.target && e.target.closest ? e.target.closest('a[href]') : null;
    if (!a) return;
    var href = a.getAttribute('href');
    if (href.charAt(0) !== '#') { a.target = '_blank'; a.rel = 'noopener noreferrer'; return; }
    e.preventDefault();
    var el = null;
    try { el = document.getElementById(decodeURIComponent(href.slice(1))); } catch { /* a bad escape names nothing */ }
    if (el) el.scrollIntoView({ block: 'start' });
  }, true);
})();
