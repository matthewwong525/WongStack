import type { Run, Timing } from './api'

// A schedule's timing and runs in plain words, read in the schedule's own timezone: `0 8 * * 1-5` → *Every weekday
// at 8:00*. A timing these words can't say reads *On a set timetable*.
const DAYS = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday']
const UNITS: Record<string, string> = { m: 'minute', h: 'hour', d: 'day' }
const UNSAID = 'On a set timetable'
const DAY_MS = 86_400_000
const NEAR: Record<number, string | undefined> = { 0: 'today', 1: 'tomorrow', [-1]: 'yesterday' }

const OUTCOME: Record<Run['state'], string> = {
  due: 'waiting', taken: 'starting', started: 'done', failed: "didn't start", blocked: "didn't start",
  missed: 'missed, computer was off', cancelled: 'cancelled',
}
export const outcome = (run: Run) => OUTCOME[run.state]

/** The timezone to read times in: the schedule's, or this device's when the browser doesn't know it. */
function zoneOf(timezone: string) {
  try { return new Intl.DateTimeFormat('en-GB', { timeZone: timezone }).resolvedOptions().timeZone } catch { return undefined }
}

function onCron(cron: string) {
  const [minute, hour, date, month, day, ...rest] = cron.trim().split(/\s+/)
  if (rest.length || !/^\d+$/.test(`${minute}${hour}`) || date !== '*' || month !== '*') return UNSAID
  const at = `at ${Number(hour)}:${minute.padStart(2, '0')}`
  if (day === '*') return `Every day ${at}`
  if (day === '1-5') return `Every weekday ${at}`
  return /^[0-7]$/.test(day) ? `Every ${DAYS[Number(day) % 7]} ${at}` : UNSAID
}

function onEvery(every: string) {
  const [, count, unit] = /^(\d+)([mhd])$/.exec(every) ?? []
  if (!unit) return UNSAID
  return count === '1' ? `Every ${UNITS[unit]}` : `Every ${count} ${UNITS[unit]}s`
}

/** When a schedule runs: *Every Friday at 10:00*, *Every 15 minutes*, *Once on Fri 24 Oct 8:00*. */
export function cadence(timing: Timing, now = Date.now()) {
  if (timing.mode === 'once') return timing.dueAt === undefined ? UNSAID : `Once on ${when(timing.dueAt, timing.timezone, now, false)}`
  if (timing.cron) return onCron(timing.cron)
  return timing.every ? onEvery(timing.every) : UNSAID
}

/** A moment near now: *today 8:00*, *tomorrow 8:00*, *Mon 8:00* within the week, else *Fri 24 Oct 8:00*. */
export function when(at: number, timezone: string, now = Date.now(), near = true) {
  const timeZone = zoneOf(timezone)
  const parts = new Intl.DateTimeFormat('en-GB', { timeZone, weekday: 'short', day: 'numeric', month: 'short', hour: 'numeric',
    minute: '2-digit', hourCycle: 'h23' }).formatToParts(at)
  const part = (type: Intl.DateTimeFormatPartTypes) => parts.find(each => each.type === type)!.value
  const time = `${Number(part('hour'))}:${part('minute')}`
  const date = (moment: number) => Date.parse(new Intl.DateTimeFormat('en-CA', { timeZone }).format(moment))
  const days = (date(at) - date(now)) / DAY_MS
  const word = NEAR[days]
  if (near && word) return `${word} ${time}`
  return near && Math.abs(days) < 7 ? `${part('weekday')} ${time}` : `${part('weekday')} ${part('day')} ${part('month')} ${time}`
}
