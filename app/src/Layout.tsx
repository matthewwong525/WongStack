import { Link, Outlet } from 'react-router'

// The frame and editable starter identity shared by every page.
export function Layout() {
  return (
    <>
      <header className="site-header">
        <Link className="site-brand" to="/">
          <img className="site-logo" src="/favicon.svg" alt="" />
          <span>WongStack</span>
        </Link>
      </header>
      <main>
        <Outlet />
      </main>
    </>
  )
}
