import { REPO_URL } from "./install";

const Logo = () => <img src="/favicon.svg" alt="" />;

/** The logo and name, linking home. */
const Brand = () => (
  <a href="/">
    <Logo />
    <span>WongStack</span>
  </a>
);

/** Quiet text links, so the hero keeps the page's one filled button. scripts/build-guides.mjs copies them into
 * every static guide page, and guides.test.ts fails when the two lists differ. */
export function SiteHeader() {
  return (
    <header className="site-header">
      <Brand />
      <nav>
        <a href="/attachments">Attachments</a>
        <a href={REPO_URL}>GitHub</a>
        <a href="/#install">Install</a>
        <a href="/guides">Guides</a>
      </nav>
    </header>
  );
}
