#!/usr/bin/env node
// A practice checkout, run by hand, for timing the private form in a real browser. Its card frame is cross-origin.
// `?delay=<ms>`: Pay switches to the receipt without a reload after that long; `?delay=never` declines instead.

import { createServer } from 'node:http';

const PAY = 'Pay $12.60';
const shop = framePort => `<!doctype html><meta charset="utf-8"><title>Practice checkout</title>
<main id="checkout"><h1>Practice checkout</h1><p>Total $12.60</p>
<iframe name="__privateStripeFrame1" title="Secure card payment" src="http://localhost:${framePort}/card" style="width:24rem;height:12rem;border:1px solid #888"></iframe>
<p><button id="pay" type="button">${PAY}</button></p><p id="status" role="status"></p></main>
<script>
document.querySelector('#pay').addEventListener('click', () => {
  const delay = new URLSearchParams(location.search).get('delay') ?? '5000';
  document.querySelector('#status').textContent = 'Processing…';
  if (delay === 'never') return void setTimeout(() => { document.querySelector('#status').textContent = 'Your card was declined.'; }, 2000);
  setTimeout(() => {
    history.pushState({}, '', '/receipt/1');
    document.querySelector('#checkout').outerHTML = '<main><h1>Thank you</h1><p>Receipt 1 · $12.60 paid</p></main>';
  }, Number(delay));
});
</script>`;
const CARD = `<!doctype html><meta charset="utf-8"><title>Card</title>
<label>Card number <input name="cardnumber" autocomplete="cc-number" inputmode="numeric"></label><br>
<label>Expiry <input name="exp-date" autocomplete="cc-exp" placeholder="MM / YY"></label><br>
<label>CVC <input name="cvc" autocomplete="cc-csc" inputmode="numeric"></label>`;

const serve = (host, body) => new Promise(done => {
  const server = createServer((request, response) => {
    const page = body(new URL(request.url, 'http://x').pathname);
    response.writeHead(page ? 200 : 404, { 'content-type': 'text/html; charset=utf-8', 'cache-control': 'no-store' }).end(page ?? '');
  });
  server.listen(0, host, () => done(server.address().port));
});

const framePort = await serve('localhost', path => (path === '/card' ? CARD : null));
const shopPort = await serve('127.0.0.1', path => (path === '/' || path.startsWith('/receipt') ? shop(framePort) : null));
console.log(`CHECKOUT_URL=http://127.0.0.1:${shopPort}/`);
