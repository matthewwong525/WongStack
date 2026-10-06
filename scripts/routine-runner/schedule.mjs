// When a routine runs next: a five-field cron expression read in an IANA timezone. No Cloudflare
// import and no Node import, so it runs in the Worker, in /routine's client, and in the script tests.
//
//   minute hour day-of-month month day-of-week
//
// Each field is `*`, a number, a range `a-b`, a list `a,b`, or any of those with a step `/n`.
// Day-of-week 0 and 7 are both Sunday. When both day fields are set, a day that matches either runs,
// as cron does.
//
// Daylight saving, as cron does it: a routine with a fixed hour runs once a day, so a time the clocks
// skip runs right after the skip, and a time the clocks repeat runs the first time only. A routine
// with `*` in its hour field follows real time, and runs in every real hour.

const FIELDS = [
  ['minute', 0, 59],
  ['hour', 0, 23],
  ['day of month', 1, 31],
  ['month', 1, 12],
  ['day of week', 0, 7],
];
const PART = /^(\*|(\d+)(?:-(\d+))?)(?:\/(\d+))?$/;
const MINUTE = 60_000;
const DAY = 24 * 60 * MINUTE;
/** How far ahead a next run is looked for: past the longest wait a real expression has, a 29 February. */
const HORIZON_DAYS = 366 * 9;

export class ScheduleError extends Error {
  constructor(message, field) {
    super(message);
    this.field = field;
  }
}

/** The values one part of a field names, or null when it is not valid there. */
function partValues(part, min, max) {
  const match = PART.exec(part);
  if (!match) return null;
  const [, base, low, high, step] = match;
  const by = step === undefined ? 1 : Number(step);
  if (by < 1) return null;
  let from = min;
  let to = max;
  if (base !== '*') {
    from = Number(low);
    // `5/10` is 5, 15, 25 and on to the field's end, as cron reads it.
    to = high === undefined ? (step === undefined ? from : max) : Number(high);
    if (from < min || to > max || from > to) return null;
  }
  const values = [];
  for (let value = from; value <= to; value += by) values.push(value);
  return values;
}

/** Returns null when the expression is a valid five-field cron, else the first bad field's name. */
export function invalidCronField(expression) {
  const fields = String(expression ?? '').trim().split(/\s+/);
  if (fields.length !== 5) return `field count (${fields[0] === '' ? 0 : fields.length}, expected 5)`;
  for (let i = 0; i < 5; i++) {
    const [name, min, max] = FIELDS[i];
    if (!fields[i].split(',').every((part) => partValues(part, min, max))) return name;
  }
  return null;
}

/** The expression with single spaces, or a ScheduleError naming the bad field. */
export function normalizeCron(expression) {
  const bad = invalidCronField(expression);
  if (bad) throw new ScheduleError(`Invalid cron "${expression}": ${bad}.`, bad);
  return String(expression).trim().split(/\s+/).join(' ');
}

/** The sets of values each field allows. */
export function parseCron(expression) {
  const fields = normalizeCron(expression).split(' ');
  const [minutes, hours, days, months, weekdays] = fields.map((field, i) => {
    const [, min, max] = FIELDS[i];
    return new Set(field.split(',').flatMap((part) => partValues(part, min, max)));
  });
  if (weekdays.has(7)) weekdays.add(0);
  weekdays.delete(7);
  const any = (field) => field.startsWith('*');
  return { minutes, hours, days, months, weekdays, anyDay: any(fields[2]), anyWeekday: any(fields[4]), everyHour: any(fields[1]) };
}

const formatters = new Map();

/** The clock of one timezone, or a ScheduleError when the name is not an IANA zone. */
function clock(timezone) {
  let format = formatters.get(timezone);
  if (!format) {
    try {
      format = new Intl.DateTimeFormat('en-US', { timeZone: timezone, hourCycle: 'h23', year: 'numeric', month: 'numeric', day: 'numeric', hour: 'numeric', minute: 'numeric', second: 'numeric' });
    } catch {
      throw new ScheduleError(`Unknown timezone "${timezone}". Use an IANA name such as America/Toronto.`, 'timezone');
    }
    formatters.set(timezone, format);
  }
  return format;
}

/** Returns null when `timezone` is an IANA zone, else why it is not. */
export function invalidTimezone(timezone) {
  if (typeof timezone !== 'string' || !timezone.trim()) return 'the timezone is empty';
  try {
    clock(timezone);
    return null;
  } catch (error) {
    return error.message;
  }
}

/** The wall clock of `timezone` at the instant `at`, as numbers. */
export function wallTime(at, timezone) {
  const parts = Object.fromEntries(clock(timezone).formatToParts(new Date(at)).filter((part) => part.type !== 'literal').map((part) => [part.type, Number(part.value)]));
  return { year: parts.year, month: parts.month, day: parts.day, hour: parts.hour, minute: parts.minute, second: parts.second };
}

/** How far `timezone` is ahead of UTC at the instant `at`, in milliseconds. */
function offsetAt(at, timezone) {
  const wall = wallTime(at, timezone);
  return Date.UTC(wall.year, wall.month - 1, wall.day, wall.hour, wall.minute, wall.second) - Math.floor(at / 1000) * 1000;
}

/**
 * The offsets `timezone` has around one local day, the earlier first: one on an ordinary day, two on
 * a day the clocks change.
 */
function offsetsAround(day, timezone) {
  return [...new Set([offsetAt(day - DAY, timezone), offsetAt(day + 2 * DAY, timezone)])];
}

/**
 * The instants at which `timezone` shows one wall time: one on an ordinary day, two when the clocks
 * repeat it, none when they skip it. `skipped` is the instant right after the skip that stands in
 * for a skipped time.
 */
function instantsOf(asUtc, offsets, timezone) {
  if (offsets.length === 1) return { instants: [asUtc - offsets[0]], skipped: asUtc - offsets[0] };
  const instants = offsets.map((offset) => asUtc - offset).filter((instant) => offsetAt(instant, timezone) === asUtc - instant).sort((a, b) => a - b);
  return { instants, skipped: asUtc - offsets[0] };
}

/**
 * The first instant after `after` (milliseconds) at which `expression` runs in `timezone`, in
 * milliseconds, or null when it never does (a 30 February).
 */
export function nextRun(expression, timezone, after) {
  const cron = parseCron(expression);
  clock(timezone);
  const from = Math.floor(Number(after) / MINUTE) * MINUTE + MINUTE;
  if (!Number.isFinite(from)) throw new ScheduleError('The time to look from is not a number.', 'after');
  const start = wallTime(from - DAY, timezone);
  const firstDay = Date.UTC(start.year, start.month - 1, start.day);
  for (let n = 0; n < HORIZON_DAYS; n++) {
    const date = new Date(firstDay + n * DAY);
    if (!cron.months.has(date.getUTCMonth() + 1)) continue;
    const onDay = cron.days.has(date.getUTCDate());
    const onWeekday = cron.weekdays.has(date.getUTCDay());
    // Cron's own rule: with both day fields set, either one is enough.
    const runs = cron.anyDay || cron.anyWeekday ? onDay && onWeekday : onDay || onWeekday;
    if (!runs) continue;
    let best = null;
    const offsets = offsetsAround(date.getTime(), timezone);
    for (const hour of cron.hours) {
      for (const minute of cron.minutes) {
        const { instants, skipped } = instantsOf(date.getTime() + (hour * 60 + minute) * MINUTE, offsets, timezone);
        const candidates = cron.everyHour ? instants : [instants.length ? instants[0] : skipped];
        for (const instant of candidates) if (instant >= from && (best === null || instant < best)) best = instant;
      }
    }
    if (best !== null) return best;
  }
  return null;
}
