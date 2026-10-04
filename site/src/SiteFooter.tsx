import { REPO_URL } from "./install";

const SUPPORT_EMAIL = "support@wongstack.com";

export const EmailLink = () => <a href={`mailto:${SUPPORT_EMAIL}`}>{SUPPORT_EMAIL}</a>;

/** The license, the privacy page, and the contact, at the end of every page. Nothing is sold, so there are no terms. */
export function SiteFooter() {
  return (
    <footer className="site-footer note">
      <a href={`${REPO_URL}/blob/main/LICENSE`}>License</a>
      <a href="/privacy">Privacy</a>
      <EmailLink />
    </footer>
  );
}
