import { Link } from 'react-router'

// Any address the route list does not name.
export function NotFound() {
  return (
    <>
      <h1>Page not found</h1>
      <p>Nothing lives at this address.</p>
      <p>
        <Link to="/">Go home</Link>
      </p>
    </>
  )
}
