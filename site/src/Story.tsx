import { YourApps } from "./apps";
import { InstallButton } from "./InstallButton";

/** Static examples: the connections explain the story without fetching business data. */
export function KnowledgeScene() {
  return (
    <section className="band story knowledge-scene" aria-labelledby="knowledge-heading">
      <div className="story-copy">
        <span className="story-step">01 / Bring it together</span>
        <h2 id="knowledge-heading">Give AI the whole picture.</h2>
        <p>AI needs all three, together.</p>
      </div>
      <figure className="knowledge-figure" aria-label="Three kinds of knowledge connected into shared business context">
        <dl className="knowledge-inputs">
          <div className="artifact processes">
            <dt>Processes</dt>
            <dd>How work gets done, in code and guides.</dd>
          </div>
          <div className="artifact data">
            <dt>Data</dt>
            <dd>The facts your business runs on.</dd>
          </div>
          <div className="artifact reasons">
            <dt>Reasons</dt>
            <dd>Why decisions were made.</dd>
          </div>
        </dl>
        <div className="join-rail" aria-hidden="true"><span>↓</span></div>
        <div className="shared-context"><span className="context-mark" aria-hidden="true">✳</span><div><strong>Shared business context</strong><span>Processes + data + reasons</span></div></div>
      </figure>
    </section>
  );
}

export function OperationsScene() {
  return (
    <section className="band story operations-scene band-shade" aria-labelledby="operations-heading">
      <div className="story-copy">
        <span className="story-step">02 / Processes</span>
        <h2 id="operations-heading">Start with operations.</h2>
        <p>WongStack sets up the foundation. AI helps turn processes into working code: code runs repeatable steps, and guides help your team.</p>
        <InstallButton />
      </div>
      <YourApps embedded />
    </section>
  );
}

export function DataScene() {
  return (
    <section className="band story data-scene" aria-labelledby="data-heading">
      <div className="story-copy">
        <span className="story-step">03 / Data</span>
        <h2 id="data-heading">Your processes connect your data.</h2>
        <p>Building a packing tool connects orders and stock. An ad report connects sales and website analytics.</p>
      </div>
      <figure className="data-connections" aria-label="Example tools and the business data they connect">
        <dl className="connected-tools">
          <div className="data-connection">
            <dt><svg aria-hidden="true" width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5"><path d="m3 7 9-5 9 5v10l-9 5-9-5V7Zm0 0 9 5 9-5M12 12v10M7.5 4.5l9 5" /></svg>Packing tool</dt>
            <dd><ul><li>Order Data</li><li>Stock Levels</li></ul></dd>
          </div>
          <div className="data-connection">
            <dt><svg aria-hidden="true" width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5"><path d="M4 3v17h17M8 16v-4m5 4V8m5 8V5" /></svg>Ad report</dt>
            <dd><ul><li>Sales Data</li><li>Website Analytics</li></ul></dd>
          </div>
        </dl>
        <figcaption>Example connections you build with your assistant.</figcaption>
      </figure>
    </section>
  );
}

export function RetentionScene() {
  return (
    <section className="band story retention-scene" aria-labelledby="retention-heading">
      <div className="story-copy">
        <span className="story-step">04 / Reasons</span>
        <h2 id="retention-heading">The more you chat, the more it knows your business.</h2>
        <p>Saved chats and memories keep the why behind your decisions, in accounts you own.</p>
      </div>
      <figure className="learning-chat" aria-label="Example conversation remembering why a business stopped broad discounts">
        <blockquote className="learning-message owner-message"><span>You</span><p>We stopped broad discounts because they hurt margins.</p></blockquote>
        <blockquote className="learning-message assistant-message"><span>Your assistant</span><p>Got it—I’ll remember why.</p></blockquote>
        <div className="remembered-note">
          <svg aria-hidden="true" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5"><path d="M6 3h12a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2Zm2 4h8M8 11h8m-8 5 2 2 4-4" /></svg>
          <div><strong>Remembered</strong><span>Broad discounts hurt margins.</span></div>
        </div>
        <figcaption>An example conversation.</figcaption>
      </figure>
    </section>
  );
}

export function TeamScene() {
  return (
    <section className="band story team-scene" aria-labelledby="team-heading">
      <div className="story-copy">
        <span className="story-step">05 / Shared knowledge, stronger questions</span>
        <h2 id="team-heading">The whole team starts with context.</h2>
        <p>As data, processes, and reasons build up, the next task starts with more context. New teammates start with existing knowledge. Ask across departments, with access you choose.</p>
      </div>
      <figure className="team-conversation" aria-label="Example promotion question gathering marketing, finance, and operations context into an answer">
        <blockquote className="team-question"><span>You ask</span>“Can we run this promotion?”</blockquote>
        <div className="gathered-context">
          <span className="gather-label">Your assistant gathers context</span>
          <dl className="department-evidence">
            <div className="marketing-source"><dt>Marketing <span>Reading the campaign goal</span></dt><dd>Reach new customers.</dd></div>
            <div className="finance-source"><dt>Finance <span>Checking past discount decisions</span></dt><dd>Broad discounts hurt margins.</dd></div>
            <div className="operations-source"><dt>Operations <span>Checking stock and capacity</span></dt><dd>Limited stock ready to ship.</dd></div>
          </dl>
        </div>
        <div className="team-answer"><span>Example answer</span><p>Reach new customers with a smaller campaign on stocked items. Offer a bundle to protect margins.</p></div>
        <figcaption>A made-up scenario. Uses the connections you’ve built, within the access you choose.</figcaption>
      </figure>
    </section>
  );
}
