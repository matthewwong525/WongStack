import { REPO_URL } from "./install";

const Logo = () => <img src="/favicon.svg" alt="" />;

/** The logo and name, linking home. */
const Brand = () => (
  <a href="/">
    <Logo />
    <span>WongStack</span>
  </a>
);

/** Two quiet text links, so the hero keeps the page's one filled button. */
export function SiteHeader() {
  return (
    <header className="site-header">
      <Brand />
      <nav>
        <a href={REPO_URL}>GitHub</a>
        <a href="/#install">Install</a>
      </nav>
    </header>
  );
}
