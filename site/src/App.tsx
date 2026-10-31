import type { ComponentType } from "react";
import { Attachments } from "./Attachments";
import { Landing } from "./Landing";
import { Privacy } from "./Privacy";
import { SiteFooter } from "./SiteFooter";
import { SiteHeader } from "./SiteHeader";

// Each path, with or without a trailing slash, shows its page. Every other path is the landing page, so an old link
// such as "/pricing" still lands somewhere: wrangler.site.jsonc sends every address with no file here.
const PAGES: Record<string, ComponentType> = { "/privacy": Privacy, "/attachments": Attachments };

export default function App() {
  const Page = PAGES[window.location.pathname.replace(/\/$/, "")] ?? Landing;
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
