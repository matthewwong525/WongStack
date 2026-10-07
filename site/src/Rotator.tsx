import { AGENTS, agents } from "./install";

// The landing page's headline: "<name> <line>", where the name slides up
// through the assistants WongStack sets up, each beside its logo. The names
// come from install.ts, so the headline names only what the install steps
// name. The slide is pure CSS (`.rotator` in index.css); a screen reader reads
// the hidden sentence once, naming them all, and skips the moving rows.

// The first name again at the end, so the loop back to it is seamless.
const ROWS = [...AGENTS, ...AGENTS.slice(0, 1)];

export function Rotator({ line }: { line: string }) {
  return (
    <h1 className="rotator">
      <span className="sr-only">
        {agents()}, {line}
      </span>
      <span aria-hidden="true">
        <span className="rotator-window">
          <span className="rotator-rows">
            {ROWS.map(({ name, logo }, i) => (
              <span className="rotator-row" key={i}>
                <img src={`/logos/${logo}.svg`} alt="" />
                {name}
              </span>
            ))}
          </span>
        </span>
        <span>{line}</span>
      </span>
    </h1>
  );
}
