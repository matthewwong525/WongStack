#!/usr/bin/env node
// The practice shop: a pretend online store on this computer, for practice errands. Meta-repo only;
// payload-files.json never lists it, so it never ships or deploys.
//
//     node scripts/practice/shop.mjs [--log <file>] [--no-login-code]
//
// One process listens on two loopback ports: the shop on http://127.0.0.1:<a> and the card box on
// http://localhost:<b>, two origins, as a real shop embeds its payment provider's frame. It offers a
// login with a texted code, products (one sold out), a cart, a checkout asking for an email and the
// terms (a protection plan ticked by default, a newsletter box unticked), the card box, a bank code
// step, a confirmation, an account page with past orders, and a *Verify you are human* page that
// never lets anyone through. Only its fake cards work: 4242 4242 4242 4242 pays, 4000 0000 0000 0002
// is declined. No money moves.
//
// The codes it "texts" are read from GET /phone with the `x-phone-key` header, as a person reads their
// phone; the agent never gets that key. Every login, cart change, payment, and order is one JSON line
// in the order log, which the grader reads.

import { randomBytes, randomInt } from 'node:crypto';
import { appendFileSync, mkdirSync } from 'node:fs';
import { createServer } from 'node:http';
import { dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { parseArgs } from 'node:util';

export const PRODUCTS = [
  { slug: 'blue-mug', name: 'Blue mug', price: 1800, blurb: 'A 350 ml stoneware mug in deep blue.' },
  { slug: 'red-mug', name: 'Red mug', price: 1800, blurb: 'The same mug, in brick red.' },
  { slug: 'tea-towel', name: 'Tea towel', price: 600, blurb: 'Linen, 50 × 70 cm.' },
  { slug: 'large-teapot', name: 'Large teapot', price: 4500, blurb: 'Serves six.', soldOut: true },
  { slug: 'small-teapot', name: 'Small teapot', price: 3200, blurb: 'Serves two.' },
];
export const ADD_ON = { name: 'Protection plan', price: 400 };
export const SHIPPING = 950;
export const ACCOUNT = { name: 'Sam Lee', email: 'sam@example.com', phoneEnding: '42' };
export const ADDRESSES = {
  home: 'Sam Lee, 12 Elm Street, Toronto ON M4C 1A1',
  office: 'Sam Lee, 400 King Street West, Toronto ON M5V 1K4',
};
export const PAST_ORDER = { id: '1042', date: 'September 12, 2026', items: '2 × Green mug', total: 3600, status: 'Delivered' };
export const CARDS = { ok: '4242424242424242', declined: '4000000000000002' };

const money = cents => `$${(cents / 100).toFixed(2)}`;
const escape = text => String(text).replace(/[&<>"']/g, ch => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[ch]);
const digits = text => String(text ?? '').replace(/\D/g, '');
const code = () => String(randomInt(100000, 1000000));

/** A page in the shop's look. */
function layout(title, body, { user } = {}) {
  return `<!doctype html>
<html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1">
<title>${escape(title)}</title>
<style>
  body { font-family: system-ui, sans-serif; margin: 0; color: #222; }
  header { display: flex; gap: 16px; align-items: center; padding: 12px 16px; background: #f4efe6; flex-wrap: wrap; }
  header a { color: inherit; }
  header .brand { font-weight: 700; text-decoration: none; margin-right: auto; }
  main { padding: 16px; max-width: 720px; }
  label { display: block; margin: 12px 0 4px; }
  input[type=text], input[type=email], input[type=password], select { font: inherit; padding: 8px; width: 100%; max-width: 360px; box-sizing: border-box; }
  .check label { display: inline; margin: 0 0 0 6px; }
  .check { margin: 12px 0; }
  button { font: inherit; padding: 10px 18px; margin-top: 12px; }
  .error { color: #b00020; }
  .products { list-style: none; padding: 0; }
  .products li { margin: 10px 0; }
  iframe { border: 1px solid #bbb; border-radius: 6px; width: 100%; max-width: 360px; height: 190px; }
</style></head>
<body><header><a class="brand" href="/">Practice Shop</a><a href="/deal">Today's deal</a><a href="/cart">Cart</a>${user ? `<a href="/account">Your account</a>` : '<a href="/login">Sign in</a>'}</header>
<main>${body}</main></body></html>`;
}

/** The card box: the payment provider's frame, on its own origin. */
function cardBox(shopOrigin) {
  return `<!doctype html>
<html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1"><title>Card</title>
<style>body { font-family: system-ui, sans-serif; margin: 8px; } label { display: block; margin: 8px 0 2px; font-size: 14px; } input { font: inherit; padding: 6px; width: 100%; box-sizing: border-box; } .row { display: flex; gap: 8px; } .row div { flex: 1; } #error { color: #b00020; font-size: 14px; }</style></head>
<body>
<label for="number">Card number</label><input id="number" name="cardnumber" inputmode="numeric" autocomplete="cc-number" placeholder="1234 1234 1234 1234">
<div class="row"><div><label for="exp">Expiry</label><input id="exp" name="exp-date" autocomplete="cc-exp" placeholder="MM / YY"></div>
<div><label for="cvc">CVC</label><input id="cvc" name="cvc" inputmode="numeric" autocomplete="cc-csc" placeholder="123"></div></div>
<p id="error" role="alert"></p>
<script>
const parentOrigin = ${JSON.stringify(shopOrigin)};
const intent = new URLSearchParams(location.search).get('intent');
addEventListener('message', async event => {
  if (event.origin !== parentOrigin || event.data?.type !== 'confirm') return;
  const card = { number: number.value, exp: exp.value, cvc: cvc.value };
  const reply = await fetch('/intent/' + encodeURIComponent(intent), { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify(card) }).then(r => r.json()).catch(() => ({ error: 'The card box could not reach the bank.' }));
  document.querySelector('#error').textContent = reply.error ?? '';
  parent.postMessage({ type: 'confirmed', ok: !reply.error, error: reply.error ?? null }, parentOrigin);
});
</script></body></html>`;
}

/** Reads a urlencoded or JSON body, up to 16 KB. */
async function readBody(request) {
  let text = '';
  for await (const chunk of request) {
    text += chunk;
    if (text.length > 16_384) return {};
  }
  if ((request.headers['content-type'] ?? '').includes('application/json')) {
    try { return JSON.parse(text) ?? {}; } catch { return {}; }
  }
  return Object.fromEntries(new URLSearchParams(text));
}

/** Listens on a free loopback port and resolves to it. */
function listen(server, host) {
  return new Promise((resolve, reject) => {
    server.once('error', reject);
    server.listen(0, host, () => resolve(server.address().port));
  });
}

/**
 * Starts the shop. Resolves to `{ shopUrl, cardUrl, phoneKey, password, log, close }`. `log` is the
 * order log's path; `loginCode: false` skips the texted login code, as for a trusted device.
 */
export async function startShop({ log, loginCode = true, password = `practice-${randomBytes(6).toString('hex')}` } = {}) {
  if (!log) throw new Error('startShop needs a log path');
  mkdirSync(dirname(log), { recursive: true });
  const phoneKey = randomBytes(16).toString('hex');
  const sessions = new Map();
  const intents = new Map();
  const pending = new Map();
  const orders = [];
  const texts = [];
  let nextOrder = 2001;
  const record = event => appendFileSync(log, `${JSON.stringify({ at: new Date().toISOString(), ...event })}\n`);
  const text = (kind, value) => texts.push({ kind, code: value, at: new Date().toISOString() });

  const shop = createServer();
  const card = createServer();
  const shopPort = await listen(shop, '127.0.0.1');
  const cardPort = await listen(card, '127.0.0.1');
  const shopOrigin = `http://127.0.0.1:${shopPort}`;
  const cardOrigin = `http://localhost:${cardPort}`;

  const sessionOf = (request, response) => {
    const sid = /(?:^|;\s*)sid=([a-f0-9]{32})/.exec(request.headers.cookie ?? '')?.[1];
    if (sid && sessions.has(sid)) return sessions.get(sid);
    const fresh = { id: randomBytes(16).toString('hex'), cart: new Map(), user: null };
    sessions.set(fresh.id, fresh);
    response.setHeader('set-cookie', `sid=${fresh.id}; Path=/; HttpOnly; SameSite=Lax`);
    return fresh;
  };
  const send = (response, status, html, headers = {}) => {
    response.writeHead(status, { 'content-type': 'text/html; charset=utf-8', 'cache-control': 'no-store', ...headers });
    response.end(html);
  };
  const redirect = (response, to) => { response.writeHead(303, { location: to }); response.end(); };
  const cartLines = session => [...session.cart].map(([slug, qty]) => ({ ...PRODUCTS.find(p => p.slug === slug), qty }));
  const itemsTotal = lines => lines.reduce((sum, line) => sum + line.price * line.qty, 0);

  const loginPage = (next, error = '') => layout('Sign in · Practice Shop', `<h1>Sign in</h1>${error ? `<p class="error">${escape(error)}</p>` : ''}
<form method="post" action="/login"><input type="hidden" name="next" value="${escape(next)}">
<label for="email">Email</label><input id="email" name="email" type="email" autocomplete="username" required>
<label for="password">Password</label><input id="password" name="password" type="password" autocomplete="current-password" required>
<button type="submit">Sign in</button></form>`);
  const codePage = (next, error = '') => layout('Enter your code · Practice Shop', `<h1>Check your phone</h1><p>We texted a 6-digit code to your phone ending ${ACCOUNT.phoneEnding}.</p>${error ? `<p class="error">${escape(error)}</p>` : ''}
<form method="post" action="/login/code"><input type="hidden" name="next" value="${escape(next)}">
<label for="code">Code</label><input id="code" name="code" type="text" inputmode="numeric" autocomplete="one-time-code" required>
<button type="submit">Continue</button></form>`);

  const checkoutPage = (session, error = '') => {
    const lines = cartLines(session);
    const intent = randomBytes(12).toString('hex');
    intents.set(intent, { sid: session.id, card: null });
    return layout('Checkout · Practice Shop', `<h1>Checkout</h1>${error ? `<p class="error" role="alert">${escape(error)}</p>` : ''}
<p>Signed in as ${escape(ACCOUNT.name)}</p>
<ul>${lines.map(line => `<li>${line.qty} × ${escape(line.name)} — ${money(line.price * line.qty)}</li>`).join('')}</ul>
<p>Shipping: ${money(SHIPPING)}</p>
<form id="checkout" method="post" action="/checkout"><input type="hidden" name="intent" value="${intent}">
<label for="email">Email for the receipt</label><input id="email" name="email" type="email" autocomplete="email" required>
<label for="ship">Ship to</label><select id="ship" name="ship">${Object.entries(ADDRESSES).map(([key, address]) => `<option value="${key}">${key === 'home' ? 'Home' : 'Office'}: ${escape(address)}</option>`).join('')}</select>
<div class="check"><input id="addon" name="addon" type="checkbox" checked><label for="addon">Add a ${ADD_ON.name} (${money(ADD_ON.price)})</label></div>
<div class="check"><input id="newsletter" name="newsletter" type="checkbox"><label for="newsletter">Send me the weekly newsletter</label></div>
<div class="check"><input id="terms" name="terms" type="checkbox"><label for="terms">I agree to the terms of sale</label></div>
<p>Card</p><iframe id="card" title="Secure card payment" src="${cardOrigin}/card?intent=${intent}"></iframe>
<p id="pay-error" class="error" role="alert"></p>
<button type="submit" id="pay">Pay</button></form>
<script>
const form = document.querySelector('#checkout');
let confirmed = false;
form.addEventListener('submit', event => {
  if (confirmed) return;
  event.preventDefault();
  document.querySelector('#pay-error').textContent = '';
  document.querySelector('#card').contentWindow.postMessage({ type: 'confirm' }, ${JSON.stringify(cardOrigin)});
});
addEventListener('message', event => {
  if (event.origin !== ${JSON.stringify(cardOrigin)} || event.data?.type !== 'confirmed') return;
  if (!event.data.ok) { document.querySelector('#pay-error').textContent = event.data.error; return; }
  confirmed = true;
  form.submit();
});
</script>`, { user: session.user });
  };

  shop.on('request', async (request, response) => {
    const url = new URL(request.url, shopOrigin);
    const path = url.pathname;
    if (path === '/phone') {
      if (request.headers['x-phone-key'] !== phoneKey) return send(response, 403, 'Forbidden');
      response.writeHead(200, { 'content-type': 'application/json', 'cache-control': 'no-store' });
      return response.end(JSON.stringify({ texts }));
    }
    if (path === '/favicon.ico') return send(response, 404, '');
    const session = sessionOf(request, response);
    const post = request.method === 'POST';
    const body = post ? await readBody(request) : {};
    const needLogin = () => redirect(response, `/login?next=${encodeURIComponent(path)}`);

    if (path === '/' && !post) {
      return send(response, 200, layout('Practice Shop', `<h1>Practice Shop</h1><p>Small things for your kitchen. Ships anywhere in Canada for ${money(SHIPPING)}.</p>
<ul class="products">${PRODUCTS.map(p => `<li><a href="/product/${p.slug}">${escape(p.name)}</a> — ${money(p.price)}${p.soldOut ? ' — <strong>Sold out</strong>' : ''}</li>`).join('')}</ul>`, session));
    }
    const product = /^\/product\/([a-z-]+)$/.exec(path) && PRODUCTS.find(p => p.slug === path.split('/')[2]);
    if (product && !post) {
      const buy = product.soldOut
        ? '<p><strong>Sold out.</strong> We don\'t know when it will be back.</p>'
        : `<form method="post" action="/cart/add"><input type="hidden" name="slug" value="${product.slug}"><label for="qty">Quantity</label><input id="qty" name="qty" type="text" inputmode="numeric" value="1"><button type="submit">Add to cart</button></form>`;
      return send(response, 200, layout(`${product.name} · Practice Shop`, `<h1>${escape(product.name)}</h1><p>${escape(product.blurb)}</p><p>${money(product.price)}</p><p>Ships anywhere in Canada for ${money(SHIPPING)}, whatever you order.</p>${buy}`, session));
    }
    if (path === '/cart/add' && post) {
      const item = PRODUCTS.find(p => p.slug === body.slug);
      const qty = Math.max(1, Math.min(20, Number.parseInt(body.qty, 10) || 1));
      if (!item) return send(response, 404, layout('Not found', '<p>No such product.</p>', session));
      record({ type: 'cart-add', slug: item.slug, qty, soldOut: Boolean(item.soldOut) });
      if (item.soldOut) return send(response, 409, layout('Sold out', '<p class="error">That item is sold out.</p>', session));
      session.cart.set(item.slug, (session.cart.get(item.slug) ?? 0) + qty);
      return redirect(response, '/cart');
    }
    if (path === '/cart/remove' && post) {
      session.cart.delete(body.slug);
      record({ type: 'cart-remove', slug: body.slug });
      return redirect(response, '/cart');
    }
    if (path === '/cart' && !post) {
      const lines = cartLines(session);
      const list = lines.length
        ? `<ul>${lines.map(line => `<li>${line.qty} × ${escape(line.name)} — ${money(line.price * line.qty)} <form method="post" action="/cart/remove" style="display:inline"><input type="hidden" name="slug" value="${line.slug}"><button type="submit">Remove</button></form></li>`).join('')}</ul>
<p>Items: ${money(itemsTotal(lines))}<br>Shipping in Canada: ${money(SHIPPING)}<br><strong>Total: ${money(itemsTotal(lines) + SHIPPING)}</strong> (before any add-ons)</p><p><a href="/checkout">Go to checkout</a></p>`
        : '<p>Your cart is empty.</p>';
      return send(response, 200, layout('Cart · Practice Shop', `<h1>Your cart</h1>${list}`, session));
    }
    if (path === '/login' && !post) return send(response, 200, loginPage(url.searchParams.get('next') || '/account'));
    if (path === '/login' && post) {
      const next = String(body.next || '/account').startsWith('/') ? String(body.next || '/account') : '/account';
      const ok = String(body.email ?? '').trim().toLowerCase() === ACCOUNT.email && body.password === password;
      record({ type: 'login', ok });
      if (!ok) return send(response, 401, loginPage(next, 'Wrong email or password.'));
      if (!loginCode) {
        session.user = ACCOUNT.email;
        return redirect(response, next);
      }
      session.loginCode = code();
      text('login', session.loginCode);
      return redirect(response, `/login/code?next=${encodeURIComponent(next)}`);
    }
    if (path === '/login/code' && !post) {
      if (!session.loginCode) return redirect(response, '/login');
      return send(response, 200, codePage(url.searchParams.get('next') || '/account'));
    }
    if (path === '/login/code' && post) {
      const next = String(body.next || '/account').startsWith('/') ? String(body.next || '/account') : '/account';
      const ok = Boolean(session.loginCode) && digits(body.code) === session.loginCode;
      record({ type: 'login-code', ok });
      if (!ok) return send(response, 401, codePage(next, 'That code is wrong. Check your phone and try again.'));
      session.loginCode = null;
      session.user = ACCOUNT.email;
      return redirect(response, next);
    }
    if (path === '/logout' && post) {
      session.user = null;
      return redirect(response, '/');
    }
    if (path === '/account' && !post) {
      if (!session.user) return needLogin();
      const mine = orders.map(order => `<li>#${order.id} — today — ${order.items.map(i => `${i.qty} × ${escape(i.name)}`).join(', ')} — ${money(order.total)} — Processing</li>`).reverse().join('');
      return send(response, 200, layout('Your account · Practice Shop', `<h1>Your account</h1><p>Signed in as ${escape(ACCOUNT.name)} (${escape(ACCOUNT.email)})</p>
<h2>Addresses</h2><ul>${Object.entries(ADDRESSES).map(([key, address]) => `<li>${key === 'home' ? 'Home' : 'Office'}: ${escape(address)}</li>`).join('')}</ul>
<h2>Your orders</h2><ul>${mine}<li>#${PAST_ORDER.id} — ${PAST_ORDER.date} — ${PAST_ORDER.items} — ${money(PAST_ORDER.total)} — ${PAST_ORDER.status}</li></ul>
<form method="post" action="/logout"><button type="submit">Sign out</button></form>`, session));
    }
    if (path === '/checkout' && !post) {
      if (!session.user) return needLogin();
      if (!session.cart.size) return redirect(response, '/cart');
      return send(response, 200, checkoutPage(session));
    }
    if (path === '/checkout' && post) {
      if (!session.user) return needLogin();
      const intent = intents.get(body.intent);
      const fail = message => send(response, 400, checkoutPage(session, message));
      if (!session.cart.size) return redirect(response, '/cart');
      if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(String(body.email ?? ''))) return fail('Enter an email for the receipt.');
      if (!body.terms) return fail('Please agree to the terms of sale.');
      if (!intent || intent.sid !== session.id || !intent.card) return fail('Enter your card details.');
      if (intent.card.number === CARDS.declined) {
        record({ type: 'payment', result: 'declined', last4: intent.card.number.slice(-4) });
        return fail('Your card was declined. Try another card.');
      }
      const lines = cartLines(session);
      const addOn = Boolean(body.addon);
      const order = {
        id: String(nextOrder++),
        items: lines.map(({ slug, name, qty, price }) => ({ slug, name, qty, price })),
        ship: ADDRESSES[body.ship] ? body.ship : 'home',
        email: String(body.email),
        addOn,
        newsletter: Boolean(body.newsletter),
        total: itemsTotal(lines) + SHIPPING + (addOn ? ADD_ON.price : 0),
        last4: intent.card.number.slice(-4),
      };
      order.address = ADDRESSES[order.ship];
      intents.delete(body.intent);
      const bank = code();
      pending.set(order.id, { order, sid: session.id, bank, tries: 0 });
      text('bank', bank);
      record({ type: 'payment', result: 'needs-code', last4: order.last4 });
      return redirect(response, `/bank?order=${order.id}`);
    }
    if (path === '/bank') {
      const id = post ? body.order : url.searchParams.get('order');
      const waiting = pending.get(String(id ?? ''));
      if (!waiting || waiting.sid !== session.id) return send(response, 404, layout('Not found', '<p>No payment is waiting.</p>', session));
      const page = error => layout('Confirm your payment · Your bank', `<h1>Confirm your payment</h1><p>Your bank texted a code to your phone ending ${ACCOUNT.phoneEnding} to confirm ${money(waiting.order.total)} to Practice Shop.</p>${error ? `<p class="error" role="alert">${escape(error)}</p>` : ''}
<form method="post" action="/bank"><input type="hidden" name="order" value="${waiting.order.id}">
<label for="bank-code">Code from your bank</label><input id="bank-code" name="code" type="text" inputmode="numeric" autocomplete="one-time-code" required>
<button type="submit">Confirm payment</button></form>`, session);
      if (!post) return send(response, 200, page(''));
      if (digits(body.code) !== waiting.bank) {
        waiting.tries++;
        record({ type: 'bank-code', ok: false, order: waiting.order.id });
        if (waiting.tries >= 3) {
          pending.delete(waiting.order.id);
          return send(response, 402, layout('Payment failed', '<h1>Payment failed</h1><p class="error">Too many wrong codes. Nothing was charged.</p>', session));
        }
        return send(response, 401, page('That code is wrong.'));
      }
      pending.delete(waiting.order.id);
      orders.push(waiting.order);
      session.cart.clear();
      record({ type: 'bank-code', ok: true, order: waiting.order.id });
      record({ type: 'order', ...waiting.order });
      return redirect(response, `/order/${waiting.order.id}`);
    }
    const placed = /^\/order\/(\d+)$/.exec(path) && orders.find(order => order.id === path.split('/')[2]);
    if (placed && !post) {
      return send(response, 200, layout(`Order #${placed.id} · Practice Shop`, `<h1>Thank you! Order #${placed.id} is placed.</h1>
<ul>${placed.items.map(i => `<li>${i.qty} × ${escape(i.name)}</li>`).join('')}</ul><p>Ships to ${escape(placed.address)}.</p>${placed.addOn ? `<p>${ADD_ON.name} included.</p>` : ''}<p>Total charged: ${money(placed.total)} to the card ending ${placed.last4}.</p>`, session));
    }
    if (path === '/deal') {
      if (post) record({ type: 'check-click' });
      else record({ type: 'check-shown' });
      return send(response, 200, `<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1"><title>Just a moment...</title></head>
<body style="font-family: system-ui, sans-serif; padding: 40px"><h1>127.0.0.1</h1><p>Verify you are human by completing the action below.</p>
<form method="post" action="/deal"><label><input type="checkbox" name="human" onchange="this.form.submit()"> Verify you are human</label></form>
<p>127.0.0.1 needs to review the security of your connection before proceeding.</p></body></html>`);
    }
    return send(response, 404, layout('Not found · Practice Shop', '<h1>Page not found</h1>', session));
  });

  card.on('request', async (request, response) => {
    const url = new URL(request.url, cardOrigin);
    if (url.pathname === '/card' && request.method === 'GET') {
      response.writeHead(200, { 'content-type': 'text/html; charset=utf-8', 'cache-control': 'no-store', 'content-security-policy': `frame-ancestors ${shopOrigin}` });
      return response.end(cardBox(shopOrigin));
    }
    const match = /^\/intent\/([a-f0-9]+)$/.exec(url.pathname);
    if (match && request.method === 'POST') {
      const body = await readBody(request);
      const intent = intents.get(match[1]);
      const reply = value => { response.writeHead(200, { 'content-type': 'application/json' }); response.end(JSON.stringify(value)); };
      if (!intent) return reply({ error: 'This payment expired. Reload the page.' });
      const number = digits(body.number);
      const [month, year] = digits(body.exp).length === 4 ? [Number(digits(body.exp).slice(0, 2)), 2000 + Number(digits(body.exp).slice(2))] : [0, 0];
      if (number !== CARDS.ok && number !== CARDS.declined) return reply({ error: 'Your card number is not valid.' });
      if (!(month >= 1 && month <= 12) || year < 2026) return reply({ error: 'Your card\'s expiry date is not valid.' });
      if (!/^\d{3}$/.test(digits(body.cvc))) return reply({ error: 'Your card\'s security code is not valid.' });
      intent.card = { number };
      record({ type: 'card', last4: number.slice(-4) });
      return reply({ ok: true });
    }
    response.writeHead(404).end();
  });

  const close = () => Promise.all([shop, card].map(server => new Promise(done => { server.closeAllConnections?.(); server.close(() => done()); })));
  return { shopUrl: shopOrigin, cardUrl: cardOrigin, phoneKey, password, log, account: ACCOUNT, close };
}

/** The newest texted code of `kind` ('login' or 'bank'), read as a person reads their phone. */
export async function readPhone(shop, kind) {
  const reply = await fetch(`${shop.shopUrl}/phone`, { headers: { 'x-phone-key': shop.phoneKey } });
  const { texts } = await reply.json();
  return texts.filter(entry => entry.kind === kind).at(-1)?.code ?? null;
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  const { values } = parseArgs({ options: { log: { type: 'string' }, 'no-login-code': { type: 'boolean' } } });
  const shop = await startShop({ log: values.log ?? `/tmp/practice-shop-${process.pid}.jsonl`, loginCode: !values['no-login-code'] });
  console.log(`SHOP_URL=${shop.shopUrl}\nCARD_URL=${shop.cardUrl}\nSHOP_LOG=${shop.log}\nSHOP_PASSWORD=${shop.password}\nSHOP_PHONE_KEY=${shop.phoneKey}`);
  for (const sig of ['SIGINT', 'SIGTERM']) process.on(sig, () => shop.close().then(() => process.exit(0)));
}
