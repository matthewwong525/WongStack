import { html } from "./vendor/preact-htm.mjs";

/** A loading state: the words for a screen reader, and grey blocks shaped like what loads for everyone else.
 *  `class` lays the blocks out like the result, so the page does not jump when it arrives. */
export const Loading = ({ label, class: className, children }) => html`<div role="status">
  <span class="sr-only">${label}</span>
  <div aria-hidden="true" class=${className}>${children}</div>
</div>`;
