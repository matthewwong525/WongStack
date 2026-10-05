import { Link, Outlet } from 'react-router'
import { appAccessSchema, useAccess } from './lib/access'

// The frame and editable starter identity shared by every page: a bar across the screen, then the page in its
// column. Sign out goes to the address Cloudflare's sign-in serves on this site, which ends the session; it is
// a plain link, so the browser leaves the app for it. A site with no sign-in has no session and shows none.
export function Layout() {
  const { data } = useAccess('apps', appAccessSchema)
  return (
    <>
      <header className="site-header">
        <Link className="site-brand" to="/">
          <img className="site-logo" src="/favicon.svg" alt="" />
          <span>WongStack</span>
        </Link>
        {data?.signIn && <a className="site-sign-out" href="/cdn-cgi/access/logout">Sign out</a>}
      </header>
      <main>
        <Outlet />
      </main>
    </>
  )
}
