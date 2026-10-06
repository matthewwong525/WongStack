import { Link, Outlet } from 'react-router'
import { Button } from '@/components/ui/button'
import { appAccessSchema, useAccess } from './lib/access'

// One frame for every page: its width and its left edge. The bar's contents sit in it too, so the logo lines up
// with each page's heading. Every page takes the whole of it: none narrows itself.
const FRAME = 'mx-auto w-full max-w-[60rem] px-4'

// The frame and editable starter identity shared by every page: a bar across the screen, then the page. Sign out goes to the address Cloudflare's sign-in serves on this site, which ends the session; it is
// a plain link, so the browser leaves the app for it. A site with no sign-in has no session and shows none.
export function Layout() {
  const { data } = useAccess('apps', appAccessSchema)
  return (
    <>
      <header className="border-b py-2">
        <div className={`${FRAME} flex items-center justify-between gap-4`}>
          <Link className="inline-flex min-h-11 items-center gap-2 font-semibold no-underline" to="/">
            <img className="h-auto w-8" src="/favicon.svg" alt="" />
            <span>WongStack</span>
          </Link>
          {data?.signIn && <Button asChild variant="ghost"><a href="/cdn-cgi/access/logout">Sign out</a></Button>}
        </div>
      </header>
      <main className={`${FRAME} my-8`}>
        <Outlet />
      </main>
    </>
  )
}
