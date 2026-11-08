import { useCallback, useState } from 'react'
import { CalendarClockIcon, EllipsisIcon } from 'lucide-react'
import { Link } from 'react-router'
import { Loading } from '@/components/Loading'
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu'
import { Skeleton } from '@/components/ui/skeleton'
import { closeChat, readChats, type Chat } from './api'
import { Archive } from './Archive'
import { useFresh } from './line'

type List = Awaited<ReturnType<typeof readChats>>

/** A row's second line: its step as a word (*Plan*), or that a schedule opened it, then its folder. */
const where = (chat: Chat) => {
  const step = chat.step ? chat.step.charAt(0) + chat.step.slice(1).toLowerCase() : chat.source?.startsWith('schedule:') ? 'From a schedule' : null
  return [step, chat.folder].filter(Boolean).join(' · ')
}

function Row({ chat, onClose }: { chat: Chat; onClose: (agentId: string) => void }) {
  const body = <div className="grid min-w-0 flex-1 gap-0.5">
    <span className="truncate font-medium">{chat.name}</span>
    <span className="truncate text-sm text-muted-foreground">{where(chat)}</span>
  </div>
  return <Card className="py-2"><CardContent className="flex min-h-11 items-center gap-2 px-3">
    {chat.review ? <Link to={`/apps/inbox/?item=${chat.review.id}`} className="flex min-w-0 flex-1 items-center gap-2">{body}<Badge>Review</Badge></Link> : body}
    {chat.closeAskedAt !== null && <Badge variant="outline">Closing</Badge>}
    {chat.agentId && <DropdownMenu modal={false}>
      <DropdownMenuTrigger asChild><Button variant="ghost" size="icon" className="size-11" aria-label={`More for ${chat.name}`}><EllipsisIcon /></Button></DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        <DropdownMenuItem disabled={chat.closeAskedAt !== null} onSelect={() => onClose(chat.agentId!)}>Close chat</DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>}
  </CardContent></Card>
}

function Part({ id, title, chats, onClose }: { id: string; title: string; chats: Chat[]; onClose: (agentId: string) => void }) {
  return <section className="mb-6 grid gap-2" aria-labelledby={id}>
    <h2 id={id} className="flex items-center gap-2 text-sm font-semibold">{title}<Badge variant="secondary">{chats.length}</Badge></h2>
    {chats.map(chat => <Row key={chat.agentId ?? chat.review!.id} chat={chat} onClose={onClose} />)}
  </section>
}

/** The person's open chats: those waiting on a review page under Needs you, then the working ones, then the Archive. */
export function Chats() {
  const [list, setList] = useState<List | null>(null)
  const [failed, setFailed] = useState(false)
  const [closeFailed, setCloseFailed] = useState(false)
  const load = useCallback(() => void readChats().then(answer => { setList(answer); setFailed(false) }, () => setFailed(true)), [])
  useFresh(load)
  const close = (agentId: string) => void closeChat(agentId).then(({ closeAskedAt }) => {
    setCloseFailed(false)
    setList(current => current && { ...current, chats: current.chats.map(chat => chat.agentId === agentId ? { ...chat, closeAskedAt } : chat) })
  }, () => setCloseFailed(true))
  const needs = list?.chats.filter(chat => chat.review) ?? []
  const working = list?.chats.filter(chat => !chat.review) ?? []
  return <>
    <div className="mb-6 flex min-h-11 items-center gap-2">
      <h1 className="min-w-0 flex-1 truncate">Inbox</h1>
      {list && (list.computerOnline ? <Badge variant="secondary">Computer online</Badge> : <Badge variant="destructive">Computer offline</Badge>)}
      <Button variant="ghost" className="min-h-11" asChild><Link to="/apps/inbox/?view=schedules"><CalendarClockIcon />Schedules</Link></Button>
    </div>
    {failed && !list && <Alert variant="destructive" className="mb-6">
      <AlertTitle>Your chats could not be loaded.</AlertTitle>
      <AlertDescription><Button size="sm" onClick={load}>Retry</Button></AlertDescription>
    </Alert>}
    {!failed && !list && <Loading label="Loading…" className="mb-6 grid gap-2"><Skeleton className="h-4 w-24" /><Skeleton className="h-14" /><Skeleton className="h-14" /></Loading>}
    {closeFailed && <p role="alert" className="mb-3 text-sm">That chat was not closed. Try again.</p>}
    {list && list.chats.length === 0 && <p className="mb-6 text-sm text-muted-foreground">No open chats. A chat you start shows here.</p>}
    {needs.length > 0 && <Part id="needs" title="Needs you" chats={needs} onClose={close} />}
    {working.length > 0 && <Part id="working" title="Working" chats={working} onClose={close} />}
    <Archive />
  </>
}
