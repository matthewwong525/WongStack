// The privacy page. Each sentence says what the site and the software do
// today. A change that makes one untrue edits this page and UPDATED in the same
// change. No lawyer has reviewed it. wiki/maintaining/landing-page.md lists the
// promises the code must keep.
import { EmailLink } from "./SiteFooter";

const UPDATED = "October 4, 2026";
const OPERATOR = "Matthew Wong, doing business as WongStack";

export function Privacy() {
  return (
    <article className="legal">
      <h1>Privacy</h1>
      <p className="note">Last updated {UPDATED}</p>
      <p>{OPERATOR}, runs this site and makes the software.</p>

      <h2>This site</h2>
      <p>This site has no sign-in. It sets no cookies. It uses no analytics, no tracking, and no ads.</p>
      <p>
        Cloudflare delivers these pages, so it handles each request, your IP address included. Every file a page loads
        comes from this site.
      </p>

      <h2>The software</h2>
      <p>
        WongStack runs on your own computer and in accounts you own. Your code, your files, your chats, and your AI
        logins never reach us.
      </p>

      <h2>If you email us</h2>
      <p>We keep your email so we can answer it. We use it for nothing else.</p>

      <h2>Questions</h2>
      <p>
        To ask what we hold about you, or to have an email deleted, write to <EmailLink />.
      </p>
    </article>
  );
}
