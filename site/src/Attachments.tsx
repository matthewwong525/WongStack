// The Attachments page: one card per site/attachments/<slug>.md, each with its own link and its text to copy.
import { useEffect } from "react";
import { ATTACHMENTS } from "./attachmentFiles";
import { CopyMessage } from "./CopyButton";

export function Attachments() {
  // The cards are drawn after the page loads, so a link to one card scrolls to it here, not by the browser.
  useEffect(() => {
    const id = decodeURIComponent(window.location.hash.slice(1));
    if (id) document.getElementById(id)?.scrollIntoView();
  }, []);
  return (
    <article className="attachments">
      <h1>Attachments</h1>
      <p className="lede">Paste one into your AI chat. It adds the fix to the setup you have.</p>
      {ATTACHMENTS.map(({ slug, title, problem, fix, body }) => (
        <section key={slug} id={slug} className="attachment">
          <h2>
            <a href={`#${slug}`}>{title}</a>
          </h2>
          <p>{problem}</p>
          <p>
            <strong>Fix:</strong> {fix}
          </p>
          <div className="attachment-message">
            <CopyMessage text={body} />
          </div>
        </section>
      ))}
    </article>
  );
}
