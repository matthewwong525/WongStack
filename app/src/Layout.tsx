import { Outlet } from 'react-router'

// The frame around every page. A header or nav goes here once a second page needs one.
export function Layout() {
  return (
    <main>
      <Outlet />
    </main>
  )
}
