import { useEffect, useRef, type MouseEvent } from 'react'
import { Link, useNavigate } from 'react-router'
import { Loading } from '@/components/Loading'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { Skeleton } from '@/components/ui/skeleton'
import { List } from './List'
import { Failed, NotSetUp } from './States'
import { address, BASE, isProblem, useRead, type Page } from './read'

// The rendered page's look: the app's stylesheet resets lists, headings and code, so the body sets them here.
const BODY = 'grid min-w-0 gap-3 wrap-anywhere [&_h2]:mt-3 [&_h3]:mt-2 [&_h3]:font-semibold [&_ul]:list-disc [&_ul]:pl-6 ' +
  '[&_ol]:list-decimal [&_ol]:pl-6 [&_pre]:overflow-x-auto [&_pre]:rounded-md [&_pre]:bg-muted [&_pre]:p-3 [&_pre]:text-sm ' +
  '[&_code]:text-sm [&_blockquote]:border-l-2 [&_blockquote]:pl-4 [&_blockquote]:text-muted-foreground [&_table]:w-full ' +
  '[&_th]:border [&_th]:px-2 [&_th]:text-left [&_td]:border [&_td]:px-2 [&_img]:max-w-full'
const saved = (at: string) => new Date(at).toLocaleString(undefined, { dateStyle: 'medium', timeStyle: 'short' })

/** Draws each diagram in place, loading the drawing code only for a page that has one. */
function draw(box: HTMLElement | null) {
  const nodes = box?.querySelectorAll<HTMLElement>('pre.mermaid')
  if (!nodes?.length) return
  void import('mermaid').then(({ default: mermaid }) => {
    mermaid.initialize({ startOnLoad: false, securityLevel: 'strict' })
    return mermaid.run({ nodes: [...nodes], suppressErrors: true })
  })
}

const back = <Button asChild variant="ghost" className="justify-self-start"><Link to={BASE}>All pages</Link></Button>

/** One page at the newest save. A link to another page opens it here, with no reload. */
export function Reader({ at }: { at: string }) {
  const [page, retry] = useRead<Page>(`page?path=${encodeURIComponent(at)}`)
  const body = useRef<HTMLDivElement>(null)
  const navigate = useNavigate()
  useEffect(() => draw(body.current), [page])
  const follow = (event: MouseEvent<HTMLElement>) => {
    const href = (event.target as Element).closest('a')?.getAttribute('href')
    if (!href?.startsWith(BASE) || href.startsWith(`${BASE}api/`) || event.button || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return
    event.preventDefault()
    navigate(href)
  }
  if (page === undefined) return <Loading label="Loading page…" className="grid gap-4"><Skeleton className="h-9 w-28" /><Skeleton className="h-64 rounded-xl" /></Loading>
  if (page === 'not-set-up') return <NotSetUp />
  if (page === 'missing') {
    return <div className="grid gap-6">
      <div className="grid gap-2">{back}<h1>This page is not there</h1><p className="text-muted-foreground">It may have moved. Pick it from all pages.</p></div>
      <List under />
    </div>
  }
  if (isProblem(page)) return <Failed what="This page" retry={retry} />
  const publicAt = `/public/${address(page.path)}`
  return <div className="grid gap-4">
    <div className="flex items-center gap-3">{back}<span className="grow" />{page.public && <Badge>Public</Badge>}</div>
    <Card className="p-6" onClick={follow}>
      {!page.html.startsWith('<h1') && <h1>{page.title}</h1>}
      <div ref={body} className={BODY} dangerouslySetInnerHTML={{ __html: page.html }} />
    </Card>
    <p className="text-sm text-muted-foreground">Saved {saved(page.saved)}{page.public && <> · public at <a href={publicAt}>{publicAt}</a></>}</p>
  </div>
}
