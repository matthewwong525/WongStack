import { Link, Outlet } from 'react-router'
import { Button } from '@/components/ui/button'
import { ThemeToggle } from '@/components/ThemeToggle'
import { appAccessSchema, useAccess } from './lib/access'

// One frame for every page: its width and its left edge. The bar's contents sit in it too, so the logo lines up
// with each page's heading. Every page takes the whole of it: none narrows itself.
const FRAME = 'mx-auto w-full max-w-[60rem] px-4'

// The frame and editable starter identity shared by every page: a bar with the light and dark switch, then the page.
// Sign out links to the address Cloudflare's sign-in serves here, ending the session; with no sign-in, it hides.
export function Layout() {
  const { data } = useAccess('apps', appAccessSchema)
  return (
    <>
      <header className="sticky top-0 z-40 flex h-14 items-center border-b bg-background/80 backdrop-blur supports-[backdrop-filter]:bg-background/60">
        <div className={`${FRAME} flex items-center justify-between gap-4`}>
          <Link className="inline-flex min-h-11 items-center gap-2 font-semibold no-underline" to="/">
            <img className="h-auto w-8" src="/favicon.svg" alt="" />
            <span>WongStack</span>
          </Link>
          <div className="flex items-center gap-1">
            <ThemeToggle />
            {data?.signIn && <Button asChild variant="ghost"><a href="/cdn-cgi/access/logout">Sign out</a></Button>}
          </div>
        </div>
      </header>
      <main className={`${FRAME} my-8`}>
        <Outlet />
      </main>
    </>
  )
}
