import { useState } from "react";

/** Two overlapping rounded squares: the usual copy icon. Drawn inline, so no icon library is loaded. */
const COPY = (
  <svg aria-hidden="true" viewBox="0 0 16 16" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="1.5">
    <rect x="5.5" y="5.5" width="8" height="8" rx="1.5" />
    <path d="M10.5 3.5v-.5a1.5 1.5 0 0 0-1.5-1.5h-5a1.5 1.5 0 0 0-1.5 1.5v5a1.5 1.5 0 0 0 1.5 1.5h.5" />
  </svg>
);
const CHECK = (
  <svg aria-hidden="true" viewBox="0 0 16 16" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2">
    <path d="M3 8.5l3.5 3.5 6.5-7" />
  </svg>
);

export type CopyResult = "copied" | "refused";

/**
 * Copies `text` in its own click, with nothing else in it, so the page keeps
 * focus and the browser does not ask for permission. It turns into ✓ Copied,
 * and tells its caller whether the browser copied or refused. `iconOnly`
 * shows just the icon, named `label` for screen readers.
 */
export function CopyButton({ text, label, iconOnly = false, onResult }: { text: string; label: string; iconOnly?: boolean; onResult: (result: CopyResult) => void }) {
  const [copied, setCopied] = useState(false);
  const copy = () =>
    Promise.resolve().then(() => navigator.clipboard.writeText(text)).then(
      () => {
        setCopied(true);
        onResult("copied");
      },
      () => onResult("refused"),
    );
  return (
    <button
      type="button"
      data-copy={iconOnly ? "icon" : "label"}
      data-copied={copied || undefined}
      aria-label={iconOnly && !copied ? label : undefined}
      title={iconOnly ? label : undefined}
      onClick={() => void copy()}
    >
      {copied ? CHECK : COPY}
      {copied ? "Copied" : !iconOnly && label}
    </button>
  );
}

/** A message in a box, with a copy icon in its corner. A refused clipboard leaves the message to select by hand. */
export function CopyMessage({ text }: { text: string }) {
  const [refused, setRefused] = useState(false);
  return (
    <>
      <div>
        <pre>{text}</pre>
        <CopyButton text={text} label="Copy message" iconOnly onResult={(result) => setRefused(result === "refused")} />
      </div>
      {refused && <p role="status">Select the message and copy it.</p>}
    </>
  );
}
