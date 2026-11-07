import { useCallback, useEffect, useState, type ReactNode } from 'react'
import { useNavigate } from 'react-router'
import { Loading } from '@/components/Loading'
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle } from '@/components/ui/sheet'
import { Skeleton } from '@/components/ui/skeleton'
import { changeSchedule, readSchedule, readSchedules, type Run, type Schedule, type Schedules as Listing } from './api'
import { cadence, outcome, when } from './cadence'
import { useFresh } from './line'
import { useBoard } from './week/hooks'
import { ViewToggle } from './week/Parts'

type Route = Parameters<typeof changeSchedule>[0]
const PROBLEM: Record<string, string | undefined> = {
  too_soon: 'This ran a moment ago. Try again later.', already_waiting: 'A run is already waiting.',
  not_waiting: 'Your computer already took that run.', ended: 'This schedule has ended.',
}

/** Whether a schedule waits for the person's OK on its computer: it changed since the last OK, or a run after that OK
 *  was refused for want of one. Only a chat on that computer gives the OK. */
const needsOk = ({ host, ended, approvedVersion, approvedAt, version, lastRun }: Schedule) => host === 'app' && !ended
  && (approvedVersion !== version || (lastRun?.state === 'blocked' && lastRun.result === 'not_approved' && lastRun.dueAt > (approvedAt ?? 0)))
const computer = (schedule: Schedule) => schedule.computerName ?? 'your computer'

function Tag({ schedule }: { schedule: Schedule }) {
  if (schedule.host === 'paseo') return <Badge variant="outline">Runs in Paseo</Badge>
  if (schedule.ended) return <Badge variant="outline">Ended</Badge>
  if (needsOk(schedule)) return <Badge variant="destructive">Needs your OK on {computer(schedule)}</Badge>
  return schedule.state === 'on' ? <Badge variant="secondary">On</Badge> : <Badge variant="outline">Paused</Badge>
}

const waitingWords = (run: Run, name: string) => run.state === 'taken' ? 'Starting on your computer…'
  : run.source === 'now' ? `Run now on ${name} is waiting for your computer.` : 'This run is waiting for your computer.'

/** What the person can do now: one primary button, Run now when on or Resume when paused, none while it needs an OK. */
function Actions({ schedule, button }: { schedule: Schedule; button: (label: string, route: Route, primary?: boolean) => ReactNode }) {
  const { host, ended, waiting, state } = schedule
  if (host === 'paseo') return <p className="text-sm text-muted-foreground">Ask your assistant to move it here.</p>
  if (ended) return <p className="text-sm text-muted-foreground wrap-anywhere">Ended {when(ended.at, schedule.timing.timezone)}: {ended.reason}</p>
  if (waiting) return <div className="flex flex-wrap items-center gap-2" role="status">
    <span className="grow text-sm">{waitingWords(waiting, schedule.name)}</span>
    {waiting.state === 'due' && button('Cancel', 'run-cancel')}
  </div>
  const ok = !needsOk(schedule)
  return <>
    {!ok && <p className="text-sm">To let it run, open a chat on {computer(schedule)} and say OK.</p>}
    <div className="flex flex-wrap justify-end gap-2">
      {state === 'on' ? <>{button('Pause', 'pause')}{ok && button('Run now', 'run-now', true)}</> : button('Resume', 'resume', ok)}
    </div>
  </>
}

/** One schedule: what it does, when it runs, how its last run went, and what the person can do now. A Paseo row is only
 *  shown; setting one up or changing it stays in the chat. */
function ScheduleCard({ schedule, now, onChanged, onOpen }: { schedule: Schedule; now: number; onChanged: () => void; onOpen: () => void }) {
  const [problem, setProblem] = useState('')
  const [busy, setBusy] = useState(false)
  const { key, name, timing, waiting, lastRun } = schedule
  const change = async (route: Route, input: { key: string } | { id: string }) => {
    setBusy(true)
    const code = await changeSchedule(route, input)
    setProblem(code === null ? '' : PROBLEM[code] ?? 'That did not go through. Try again.')
    setBusy(false)
    onChanged()
  }
  const button = (label: string, route: Route, primary = false) => <Button type="button" size="sm" variant={primary ? 'default' : 'ghost'}
    disabled={busy} onClick={() => void change(route, route === 'run-cancel' ? { id: waiting!.id } : { key })}>{label}</Button>
  const next = schedule.state === 'on' && schedule.nextRunAt !== null ? `next run ${when(schedule.nextRunAt, timing.timezone, now)}` : ''
  return <Card className="gap-2 p-4">
    <div className="flex items-start justify-between gap-2">
      <h3 className="text-base wrap-anywhere"><button type="button" className="text-left underline-offset-4 hover:underline" onClick={onOpen}>
        {name}</button></h3>
      <Tag schedule={schedule} />
    </div>
    {schedule.summary && <p className="text-sm wrap-anywhere">{schedule.summary}</p>}
    <p className="text-sm text-muted-foreground">{[cadence(timing, now), next].filter(Boolean).join(' · ')}</p>
    {lastRun && <p className={`text-sm ${lastRun.state === 'missed' ? 'text-destructive' : 'text-muted-foreground'}`}>
      Last run {when(lastRun.dueAt, timing.timezone, now)} · {outcome(lastRun)}</p>}
    <Actions schedule={schedule} button={button} />
    {problem && <p className="text-sm" role="alert">{problem}</p>}
  </Card>
}

/** A schedule's instructions, as plain text the view never changes, its ten newest runs, and the quiet ones counted. */
function Detail({ schedule, now, onClose }: { schedule: Schedule; now: number; onClose: () => void }) {
  const [found, setFound] = useState<{ runs: Run[]; quiet: number } | null>(null)
  const [failed, setFailed] = useState(false)
  useEffect(() => { void readSchedule(schedule.key).then(setFound, () => setFailed(true)) }, [schedule.key])
  const runs = found?.runs
  const { timezone } = schedule.timing
  return <Sheet open onOpenChange={onClose}>
    <SheetContent className="w-full overflow-y-auto sm:max-w-md">
      <SheetHeader>
        <SheetTitle className="wrap-anywhere">{schedule.name}</SheetTitle>
        <SheetDescription>{cadence(schedule.timing, now)}</SheetDescription>
      </SheetHeader>
      <div className="grid gap-6 px-4 pb-4">
        <section className="grid gap-1" aria-labelledby="instructions">
          <h2 id="instructions" className="text-sm font-semibold">Instructions</h2>
          <p className="text-sm whitespace-pre-wrap wrap-anywhere">{schedule.instructions || 'None here: it runs in Paseo.'}</p>
        </section>
        <section className="grid gap-1" aria-labelledby="runs">
          <h2 id="runs" className="text-sm font-semibold">Last runs</h2>
          {failed && <p role="alert" className="text-sm">The runs could not be loaded.</p>}
          {!failed && !runs && <Loading label="Loading…" className="grid gap-2"><Skeleton className="h-4" /><Skeleton className="h-4" /></Loading>}
          {runs?.length === 0 && !found?.quiet && <p className="text-sm text-muted-foreground">No runs yet.</p>}
          {runs && runs.length > 0 && <ul className="grid gap-1 text-sm">
            {runs.map(run => <li key={run.id}>{when(run.dueAt, timezone, now)} · {outcome(run)}</li>)}
          </ul>}
          {found?.quiet ? <p className="text-sm text-muted-foreground">
            {found.quiet === 1 ? '1 quiet check found' : `${found.quiet} quiet checks found`} nothing to do</p> : null}
        </section>
      </div>
    </SheetContent>
  </Sheet>
}

/** The signed-in person's own schedules, one card each; ended ones wait in a closed section below. */
export function Schedules() {
  const navigate = useNavigate()
  const board = useBoard()
  // Each read keeps the moment it came back, so *today* and *tomorrow* are said from then.
  const [data, setData] = useState<Listing & { now: number } | null>(null)
  const [error, setError] = useState(false)
  const [open, setOpen] = useState<Schedule | null>(null)
  const load = useCallback(() => readSchedules().then(listing => { setData({ ...listing, now: Date.now() }); setError(false) },
    () => setError(true)), [])
  useFresh(load)
  const card = (schedule: Schedule) => <ScheduleCard key={schedule.key} schedule={schedule} now={data!.now} onChanged={() => void load()}
    onOpen={() => setOpen(schedule)} />
  const ended = data?.schedules.filter(schedule => schedule.ended) ?? []
  return <>
    <div className="mb-6 flex min-h-11 items-center gap-2">
      <h1 className="min-w-0 truncate">Inbox</h1>
      {data && (data.computerOnline ? <Badge variant="secondary">Computer online</Badge> : <Badge variant="destructive">Computer offline</Badge>)}
    </div>
    <div className="mb-5"><ViewToggle view="schedules" board={board} onView={view => void navigate(`/apps/inbox/?view=${view}`)} /></div>
    {error && !data && <Alert variant="destructive">
      <AlertTitle>Schedules could not be loaded.</AlertTitle>
      <AlertDescription><Button size="sm" onClick={() => void load()}>Retry</Button></AlertDescription>
    </Alert>}
    {!error && !data && <Loading label="Loading your schedules…" className="grid gap-3"><Skeleton className="h-28" /><Skeleton className="h-28" /></Loading>}
    {data && <section className="grid grid-cols-1 gap-3" aria-label="Schedules">
      {data.schedules.filter(schedule => !schedule.ended).map(card)}
      {data.schedules.length === 0 && <Card className="gap-1 p-4">
        <p className="font-semibold">No schedules yet</p>
        <p className="text-sm text-muted-foreground">Ask a chat to do something every week, or on a date.</p>
      </Card>}
      {ended.length > 0 && <details className="grid gap-3">
        <summary className="min-h-11 cursor-pointer py-2 text-sm font-semibold">Ended ({ended.length})</summary>
        <div className="grid gap-3">{ended.map(card)}</div>
      </details>}
    </section>}
    {open && data && <Detail key={open.key} schedule={open} now={data.now} onClose={() => setOpen(null)} />}
  </>
}
