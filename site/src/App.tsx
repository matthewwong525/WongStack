import { Landing } from "./Landing";
import { Privacy } from "./Privacy";
import { SiteFooter } from "./SiteFooter";
import { SiteHeader } from "./SiteHeader";

// "/privacy" is the privacy page, with or without a trailing slash. Every
// other path is the landing page, so an old link to a page that is gone, such
// as "/pricing" or "/login", still lands somewhere. wrangler.site.jsonc sends
// every address with no file here.
export default function App() {
  const Page = window.location.pathname.replace(/\/$/, "") === "/privacy" ? Privacy : Landing;
  return (
    <div className="site">
      <SiteHeader />
      <main>
        <Page />
      </main>
      <SiteFooter />
    </div>
  );
}
