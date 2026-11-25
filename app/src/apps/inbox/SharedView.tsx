import { useCallback, useEffect, useRef, useState } from 'react'
import { useNavigate } from 'react-router'
import { Loading } from '@/components/Loading'
import { Button } from '@/components/ui/button'
import { Skeleton } from '@/components/ui/skeleton'
import { Failed, readMedia, readShared } from './api'
import { DownloadButton } from './Download'
import { sharedFileUrl, sharedMediaUrl } from './downloads'
import { appLook, frameMessage, PAGE_COLUMN } from './frame'
import { PageFrame } from './PlanView'

type Shown = Awaited<ReturnType<typeof readShared>>
const ENDED = {
  stopped: { title: 'This page is no longer shared', text: 'The person who shared it turned the link off. Ask them for a new link.' },
  missing: { title: 'This link does not exist', text: 'Check the link, or ask the person who sent it for a new one.' },
}
const day = (at: number) => new Date(at).toLocaleDateString('en-GB', { day: 'numeric', month: 'short' })
const failure = (error: unknown) => !(error instanceof Failed) ? 'error' : error.status === 410 ? 'stopped' : error.status === 404 ? 'missing' : 'error'

/** A page a teammate shared, at `?shared=<token>`: its title, who shared it, a Download for its files, and the page,
 *  sealed and read-only; its files download once, on open. wiki/development/plain-pages.md#share-with-team */
export function SharedView({ token }: { token: string }) {
  const navigate = useNavigate()
  const [shown, setShown] = useState<Shown | null>(null)
  const [state, setState] = useState<'loading' | 'error' | keyof typeof ENDED>('loading')
  const port = useRef<MessagePort | null>(null)
  const frame = useRef<HTMLIFrameElement>(null)
  const load = useCallback(() => readShared(token).then(setShown, (error: unknown) => setState(failure(error))), [token])
  useEffect(() => { void load() }, [load])
  const retry = () => { setState('loading'); void load() }
  useEffect(() => () => port.current?.close(), [])
  // A review page waits for the inbox's hello: read-only, it shows no buttons. Only its own Back and its pictures
  // are heard; a tap or a note goes nowhere.
  const listen = async (data: unknown) => {
    const message = frameMessage(data, { actions: [], key: null })
    if (message?.type === 'inbox:back') void navigate('/apps/inbox/')
    if (message?.type === 'inbox:media') port.current?.postMessage({ type: 'inbox:media-result', ref: message.ref,
      ...await readMedia(sharedMediaUrl(token, message.name)) })
  }
  const greet = () => {
    port.current?.close()
    const { port1, port2 } = new MessageChannel()
    port1.onmessage = event => void listen(event.data)
    port.current = port1
    frame.current?.contentWindow?.postMessage({ type: 'inbox:hello', item: token, version: 'shared', actions: [], readOnly: true, workspace: '',
      files: [], theme: appLook() }, '*', [port2])
  }
  const urlOf = useCallback((name: string) => sharedFileUrl(token, name), [token])
  if (shown) return <div className={PAGE_COLUMN}>
    <div className="flex min-w-0 flex-wrap items-center gap-2">
      <div className="flex min-w-0 flex-col gap-0.5">
        <h1 className="truncate font-semibold">{shown.title}</h1>
        <p className="text-sm text-muted-foreground">Shared by {shown.sharedBy} · updated {day(shown.updatedAt)}</p>
      </div>
      {shown.files.length > 0 && <div className="ml-auto flex flex-wrap items-center gap-2">
        <DownloadButton files={shown.files} urlOf={urlOf} auto /></div>}
    </div>
    <PageFrame title={shown.title} src={`/apps/inbox/api/shared-frame?token=${encodeURIComponent(token)}`} frameRef={frame} onLoad={greet} />
  </div>
  const ended = state === 'stopped' || state === 'missing' ? ENDED[state] : null
  if (ended) return <div className="grid justify-items-center gap-2 py-16 text-center">
    <h1 className="text-lg font-semibold">{ended.title}</h1><p className="text-muted-foreground">{ended.text}</p></div>
  if (state === 'error') return <div className="grid gap-4"><p role="alert">The page could not be loaded.</p>
    <Button type="button" variant="outline" className="justify-self-start" onClick={retry}>Retry</Button></div>
  return <Loading label="Loading…" className="grid gap-3"><Skeleton className="h-8" /><Skeleton className="h-96" /></Loading>
}
