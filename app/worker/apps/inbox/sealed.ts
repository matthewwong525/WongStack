// The sealed document an inbox page is shown in, framed or in a tab. wiki/development/plain-pages.md#why-and-edge-cases

/** A page's own script runs with an opaque origin and no network, so it can't read the sign-in or call the app,
 *  even when its frame address is opened in a tab of its own. */
const SEALED = {
  "Content-Type": "text/html; charset=utf-8",
  "Content-Security-Policy": "sandbox allow-scripts allow-popups allow-popups-to-escape-sandbox; default-src 'none'; script-src 'unsafe-inline'; "
    + "style-src 'unsafe-inline'; img-src data: blob:; font-src data:; media-src data: blob:; connect-src 'none'; frame-src 'none'; "
    + "form-action 'none'; base-uri 'none'",
  "X-Content-Type-Options": "nosniff", "Cache-Control": "private, no-store", "Referrer-Policy": "no-referrer",
};
export const sealedPage = (body: string, plain: boolean) => new Response(plain ? linksOpenOwnTab(body) : body, { headers: SEALED });

/** A plain page's links open their own tab, and a `#` link with no target stays in the page. Keep in step with its twin
 *  in .agents/skills/page/scripts/page.mjs; a page put before that one gets it here. */
export function linksOpenOwnTab(html: string) {
  if (/<base[\s>]/i.test(html)) return html;
  html = html.replace(/<a\b(?![^>]*\starget\s*=)([^>]*\shref\s*=\s*["']#)/gi, '<a target="_self"$1');
  const head = /<head(\s[^>]*)?>/i.exec(html);
  // Before a doctype, the tag would put the page in quirks mode.
  const at = head ? head.index + head[0].length : /^\s*<!doctype[^>]*>/i.exec(html)?.[0].length ?? 0;
  return `${html.slice(0, at)}<base target="_blank">${html.slice(at)}`;
}
