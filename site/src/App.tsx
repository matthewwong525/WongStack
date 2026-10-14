import { Landing } from "./Landing";
import { Privacy } from "./Privacy";
import { SiteFooter } from "./SiteFooter";
import { SiteHeader } from "./SiteHeader";

// "/privacy", with or without a trailing slash, is the privacy page. Every other path is the landing page, so an
// old link such as "/pricing" still lands somewhere: wrangler.site.jsonc sends every address with no file here.
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
