import { Link, Outlet } from 'react-router'
import { Button } from '@/components/ui/button'
import { appAccessSchema, useAccess } from './lib/access'

// The frame and editable starter identity shared by every page: a bar across the screen, then the page in its
// narrow column. Sign out goes to the address Cloudflare's sign-in serves on this site, which ends the session; it is
// a plain link, so the browser leaves the app for it. A site with no sign-in has no session and shows none.
export function Layout() {
  const { data } = useAccess('apps', appAccessSchema)
  return (
    <>
      <header className="flex items-center justify-between gap-4 border-b px-4 py-2">
        <Link className="inline-flex min-h-11 items-center gap-2 font-semibold no-underline" to="/">
          <img className="h-auto w-8" src="/favicon.svg" alt="" />
          <span>WongStack</span>
        </Link>
        {data?.signIn && <Button asChild variant="ghost"><a href="/cdn-cgi/access/logout">Sign out</a></Button>}
      </header>
      <main className="mx-auto my-8 max-w-lg px-4">
        <Outlet />
      </main>
    </>
  )
}
