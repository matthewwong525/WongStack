// The first change a person makes: removing this message teaches the whole loop.
// Removing it means deleting this file and its one line in App.tsx.
export function Tutorial() {
  return (
    <section aria-labelledby="start-here">
      <h2 id="start-here">Start here: remove this message</h2>
      <p>Your first change is to remove this message. It shows you how every change works.</p>
      <ol>
        <li>
          Tell the agent: <code>remove the tutorial message</code>.
        </li>
        <li>It sends you a plan to read. Say yes to build it.</li>
        <li>It sends you a preview link to try. Say yes to publish it.</li>
        <li>Open this page again. The message is gone.</li>
      </ol>
    </section>
  )
}
