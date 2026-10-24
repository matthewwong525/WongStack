import { useCallback, useState } from 'react'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { changeSchedule, readSchedules, type Run, type Schedule, type Schedules as Listing } from './api'
import { cadence, outcome, when } from './cadence'
import { Header } from './Header'
import { useFresh } from './line'
import { Unready } from './Unready'

type Route = Parameters<typeof changeSchedule>[0]
const PROBLEM: Record<string, string | undefined> = {
  too_soon: 'This ran a moment ago. Try again later.', already_waiting: 'A run is already waiting.',
  not_waiting: 'Your computer already took that run.',
}

function Tag({ schedule }: { schedule: Schedule }) {
  if (schedule.host === 'paseo') return <Badge variant="outline">Runs in Paseo</Badge>
  return schedule.state === 'on' ? <Badge variant="secondary">On</Badge> : <Badge variant="outline">Paused</Badge>
}

const waitingWords = (run: Run, name: string) => run.state === 'taken' ? 'Starting on your computer…'
  : run.source === 'now' ? `Run now on ${name} is waiting for your computer.` : 'This run is waiting for your computer.'

/** One schedule: what it does, when it runs, how its last run went, and what the owner can do now. A Paseo row is only
 *  shown; setting one up or changing it stays in the chat. */
function ScheduleCard({ schedule, now, onChanged }: { schedule: Schedule; now: number; onChanged: () => void }) {
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
      <h3 className="text-base wrap-anywhere">{name}</h3>
      <Tag schedule={schedule} />
    </div>
    {schedule.summary && <p className="text-sm wrap-anywhere">{schedule.summary}</p>}
    <p className="text-sm text-muted-foreground">{[cadence(timing, now), next].filter(Boolean).join(' · ')}</p>
    {lastRun && <p className={`text-sm ${lastRun.state === 'missed' ? 'text-destructive' : 'text-muted-foreground'}`}>
      Last run {when(lastRun.dueAt, timing.timezone, now)} · {outcome(lastRun)}</p>}
    {schedule.host === 'paseo' ? <p className="text-sm text-muted-foreground">Ask your assistant to move it here.</p>
      : waiting ? <div className="flex flex-wrap items-center gap-2" role="status">
        <span className="grow text-sm">{waitingWords(waiting, name)}</span>
        {waiting.state === 'due' && button('Cancel', 'run-cancel')}
      </div>
      : <div className="flex flex-wrap justify-end gap-2">
        {schedule.state === 'on' ? <>{button('Pause', 'pause')}{button('Run now', 'run-now', true)}</> : button('Resume', 'resume', true)}
      </div>}
    {problem && <p className="text-sm" role="alert">{problem}</p>}
  </Card>
}

/** The signed-in person's schedules, one card each, beside their agents. */
export function Schedules() {
  // Each read keeps the moment it came back, so *today* and *tomorrow* are said from then.
  const [data, setData] = useState<Listing & { now: number } | null>(null)
  const [error, setError] = useState(false)
  const load = useCallback(() => readSchedules().then(listing => { setData({ ...listing, now: Date.now() }); setError(false) },
    () => setError(true)), [])
  useFresh(load)
  if (!data) return <Unready error={error} label="Loading your schedules…" onRetry={() => void load()} />
  return <div className="grid grid-cols-1 gap-6">
    <Header online={data.computerOnline} />
    <section className="grid grid-cols-1 gap-3" aria-label="Schedules">
      {data.schedules.map(schedule => <ScheduleCard key={schedule.key} schedule={schedule} now={data.now} onChanged={() => void load()} />)}
      {data.schedules.length === 0 && <Card className="gap-1 p-4">
        <p className="font-semibold">No schedules yet</p>
        <p className="text-sm text-muted-foreground">Ask your assistant to do something every week, or on a date.</p>
      </Card>}
    </section>
  </div>
}
