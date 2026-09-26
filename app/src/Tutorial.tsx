// A first tour of the loop. The last step removes it: delete this file and its
// one line in App.tsx.
export function Tutorial() {
  return (
    <section aria-labelledby="get-started">
      <h2 id="get-started">Get started</h2>
      <ol>
        <li>
          Ask the agent for a small tool: <code>make me a tip calculator</code>. It sends you a
          preview link.
        </li>
        <li>
          Say <code>/save</code>. The tool goes live and shows up in Your apps.
        </li>
        <li>
          Change this app: <code>/ship add a sign-in page</code>. The agent plans, builds, and
          merges it.
        </li>
        <li>
          Done with this tour? Say <code>remove the tutorial</code>.
        </li>
      </ol>
    </section>
  )
}
