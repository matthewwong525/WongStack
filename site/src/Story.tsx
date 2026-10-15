import { Icon, type IconName } from "./icons";

// The talk "How to self-drive your business", one scene per slide, drawn as the slides draw them. Static examples:
// no business data is fetched.

const THREE: { car: string; part: string; line: string; kind: string; icon: IconName }[] = [
  { car: "Sensors", part: "Data", line: "What your business sees", kind: "data", icon: "database" },
  { car: "Rules", part: "Process", line: "How the work gets done", kind: "processes", icon: "process" },
  { car: "Navigation", part: "Reason", line: "Where to go, and why", kind: "reasons", icon: "compass" },
];

/** Slide 3: the car's three parts, each over the business's own. */
export function SameThreeScene() {
  return (
    <section className="band story three-scene" aria-labelledby="three-heading">
      <div className="story-copy">
        <span className="story-step">01 / The idea</span>
        <h2 id="three-heading">Your business has the same three.</h2>
        <p>A self-driving car needs sensors, rules, and navigation.</p>
      </div>
      <figure className="three-figure" aria-label="A self-driving car's sensors, rules, and navigation beside your business's data, process, and reason">
        <ol className="three-pairs">
          {THREE.map(({ car, part, line, kind, icon }) => (
            <li className={kind} key={part}>
              <span className="car-part">{car}</span>
              <span className="pair-arrow" aria-hidden="true">↓</span>
              <span className="part-card">
                <span className="icon-dot"><Icon name={icon} /></span>
                <strong>{part}</strong>
                <span className="part-line">{line}</span>
              </span>
            </li>
          ))}
        </ol>
      </figure>
    </section>
  );
}

const SOURCES: [string, IconName][] = [
  ["Ad spend", "dollar"],
  ["Creatives", "image"],
  ["Sales", "cart"],
  ["Customers", "users"],
];

/** Slide 4: four tools join into one place you own. */
export function DataScene() {
  return (
    <section className="band story data-scene" aria-labelledby="data-heading">
      <div className="story-copy">
        <span className="story-step">02 / Data</span>
        <h2 id="data-heading">Data is what your business sees.</h2>
        <p>Ads in one tool, sales in another: blind spots. In one place you own, AI sees the whole road.</p>
      </div>
      <figure className="data-figure data" aria-label="Ad spend, creatives, sales, and customers joining into one place you own">
        <ul className="data-sources">
          {SOURCES.map(([source, icon]) => (
            <li key={source}>
              <Icon name={icon} />
              {source}
            </li>
          ))}
        </ul>
        <span className="join-arrow" aria-hidden="true" />
        <p className="one-place">
          <span className="icon-dot"><Icon name="database" /></span>
          One place you own
        </p>
      </figure>
    </section>
  );
}

const KEEPS: { name: string; line: string; icon: IconName; kept: boolean }[] = [
  { name: "Code", line: "Does the same step the same way, every time", icon: "code", kept: true },
  { name: "A skill", line: "Steps the AI follows when it takes judgment", icon: "sparkles", kept: true },
  { name: "An SOP", line: "Nobody runs it, so it never gets updated", icon: "fileX", kept: false },
];

/** Slide 5: an ad's steps, then what keeps them: code and a skill run, an SOP sits. */
export function ProcessScene() {
  return (
    <section className="band story process-scene band-shade" aria-labelledby="process-heading">
      <div className="story-copy">
        <span className="story-step">03 / Process</span>
        <h2 id="process-heading">Process is how the work gets done.</h2>
        <p>The process changes all the time. Only what runs the job stays up to date.</p>
      </div>
      <figure className="process-figure processes" aria-label="An ad's process, and three ways to keep it">
        <ol className="process-steps">
          {["Research", "Brief", "Creative", "Publish"].map((step) => <li key={step}>{step}</li>)}
        </ol>
        <dl className="process-kinds">
          {KEEPS.map(({ name, line, icon, kept }) => (
            <div className={kept ? "kept" : "dropped"} key={name}>
              <dt>
                <span className="icon-dot"><Icon name={icon} /></span>
                <span className="kind-mark" aria-hidden="true">{kept ? "✓" : "✗"}</span>
                {kept ? name : <><span className="sr-only">Not </span><s>{name}</s></>}
              </dt>
              <dd>{line}</dd>
            </div>
          ))}
        </dl>
      </figure>
    </section>
  );
}

/** Slide 6: the talk's road, with a question at each stop. */
export function ReasonScene() {
  return (
    <section className="band story reason-scene" aria-labelledby="reason-heading">
      <div className="story-copy">
        <span className="story-step">04 / Reason</span>
        <h2 id="reason-heading">Reason is why you chose this road.</h2>
        <p>Saved from your chats, so the next task starts with the why.</p>
      </div>
      <figure className="reason-figure reasons" aria-label="Three questions a saved reason answers, along the road">
        <img
          className="road"
          src="/art/road.webp"
          alt="A winding road with three stops and a pin at the end"
          width={1600}
          height={491}
          loading="lazy"
        />
        <ul className="why-questions">
          {["Why are we running ads?", "Why this audience?", "Why this message?"].map((question) => (
            <li key={question}>{question}</li>
          ))}
        </ul>
      </figure>
    </section>
  );
}

const EXAMPLE: { what: string; part: string; kind: string; icon: IconName; partIcon: IconName }[] = [
  { what: "Your ad metrics", part: "Data", kind: "data", icon: "chart", partIcon: "database" },
  { what: "Your campaign structure", part: "Process", kind: "processes", icon: "network", partIcon: "process" },
  { what: "Why you have this setup", part: "Reason", kind: "reasons", icon: "message", partIcon: "compass" },
];

/** Slide 7: each part of publishing an ad, and which of the three it is. */
export function ExampleScene() {
  return (
    <section className="band story example-scene" aria-labelledby="example-heading">
      <div className="story-copy">
        <span className="story-step">05 / One example</span>
        <h2 id="example-heading">One example: publishing an ad.</h2>
        <p>Start with one process, and the other two come with it.</p>
      </div>
      <figure className="example-figure" aria-label="What publishing an ad needs: data, process, and reason">
        <dl className="example-rows">
          {EXAMPLE.map(({ what, part, kind, icon, partIcon }) => (
            <div className={kind} key={part}>
              <dt><Icon name={icon} />{what}</dt>
              <dd><span className="icon-dot"><Icon name={partIcon} /></span>{part}</dd>
            </div>
          ))}
        </dl>
      </figure>
    </section>
  );
}

const HANDLED: [string, IconName][] = [
  ["Servers and databases", "server"],
  ["Security", "shield"],
  ["Collaboration", "users"],
  ["Memory", "brain"],
];

/** Slide 8: what setup takes care of, just before the install steps. */
export function SetupScene() {
  return (
    <section className="band setup-section" aria-labelledby="setup-heading">
      <h2 id="setup-heading">The hardest part is the setup.</h2>
      <p className="lede">Handled for you. AI figures out any problems.</p>
      <ul className="handled">
        {HANDLED.map(([item, icon]) => (
          <li key={item}>
            <span className="icon-dot"><Icon name={icon} /></span>
            {item}
          </li>
        ))}
      </ul>
    </section>
  );
}
