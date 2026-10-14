import { AGENTS, agents } from "./install";

// The headline: "<name> <line>", where the name slides up through install.ts's assistants, each beside its logo.
// The slide is pure CSS (`.rotator` in index.css); a screen reader reads one hidden sentence and skips the rows.

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
