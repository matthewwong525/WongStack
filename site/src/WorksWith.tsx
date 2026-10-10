import { AGENTS } from "./install";
import { InstallButton } from "./InstallButton";

// Model flexibility: one card per assistant WongStack sets
// up, from install.ts, then one for any other assistant with its true limit.
// Say only what works today: memory loads by itself in the listed assistants,
// and another one looks it up when asked.

/** What every assistant in install.ts's list gets on day one. */
const SET_UP = "Set up on day one: your skills are ready, and memory loads by itself in every chat.";

/** Any assistant not in the list, and what it does by hand. */
const ANOTHER = {
  name: "Another assistant",
  text: "It reads the same files, so your skills work. It looks memory up when you ask.",
};

/** Under the cards: nothing is tied to one assistant. */
const SWITCH = "Switch any time. Your skills, memory, and apps stay in your folder and your accounts.";

export function WorksWith() {
  return (
    <section className="band model-flexibility">
      <h2>Use the best models.</h2>
      <p className="lede">The WongStack framework works with any model or setup through a coding agent that can read and change files and run commands.</p>
      <div className="grid works">
        {AGENTS.map(({ name, logo }) => (
          <article className="card" key={name}>
            <h3>
              <img src={`/logos/${logo}.svg`} alt="" />
              {name}
            </h3>
            <p>{SET_UP}</p>
          </article>
        ))}
        <article className="card">
          <h3>{ANOTHER.name}</h3>
          <p>{ANOTHER.text}</p>
        </article>
      </div>
      <p className="note">{SWITCH}</p>
      <InstallButton />
    </section>
  );
}
