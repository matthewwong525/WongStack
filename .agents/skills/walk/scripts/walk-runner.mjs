// The walkthrough harness.
//
// It owns everything about driving a browser that must not vary between runs —
// attaching to the remote browser, authenticating past Access, opening one
// recorded context per journey, screenshotting every step, and writing the
// evidence manifest. What it does NOT own is the journeys: those are generated
// per run by /walk's scout, written into <run-dir>/journeys/, and deleted with
// the run directory.
//
// That split is the point. Regenerating this file every run would mean an agent
// re-deriving browser plumbing under time pressure, on the one code path where a
// silent mistake reads as a passing gate. Regenerating the *steps* every run is
// unavoidable — they are different every time. So the plumbing is committed
// payload and the steps are throwaway.
//
// The browser itself is not on this machine. Each journey gets its own session
// on Cloudflare Browser Run, attached over CDP with the same CLOUDFLARE_API_TOKEN
// the stack pack provisions. Nothing here launches, installs, or looks for a
// local binary — the library half of Playwright (playwright-core, pure JS) is
// the repo's declared dependency, and the process half is Cloudflare's.
// One session per journey, not one per walk: a session-duration limit then
// bounds one journey's evidence rather than the walk, and a session that dies
// mid-journey costs that journey alone.
//
// A journey module looks like:
//
//     export const meta = {
//       id: 'empty-title-rejected',
//       requirement: 'Notes can be created',
//       scenario: 'Submitting with no title is rejected',
//       then: 'the form shows "Title is required" and nothing is saved',
//     }
//     export default async function journey(page, step) {
//       await page.goto('/')
//       await step('landing')
//       await page.getByRole('button', { name: 'New note' }).click()
//       await step('empty form')
//       await page.getByRole('button', { name: 'Save' }).click()
//       await step('after submitting empty')      // ← the THEN is judged here
//     }
//
// `then` is carried verbatim from the OpenSpec scenario. The harness never
// reads it and never compares anything against it — it only records it beside
// the evidence so the grader is judging the author's words rather than a
// paraphrase invented at walk time.
//
// Exit codes: 0 every journey attempted · 2 harness could not start
//             3 Cloudflare Access challenge (UNVERIFIED, not a failing page)
//             4 Browser Run refused the token (unwidened, or plan budget spent)

import { createRequire } from 'node:module'
import { readdir, mkdir, writeFile } from 'node:fs/promises'
import { existsSync } from 'node:fs'
import path from 'node:path'
import { pathToFileURL } from 'node:url'

const [, , RUN_DIR, APP_DIR] = process.argv
const URL_UNDER_TEST = process.env.WALK_URL
const TOKEN = process.env.CLOUDFLARE_API_TOKEN
const ACCOUNT_ID = process.env.WALK_CF_ACCOUNT_ID

if (!RUN_DIR || !APP_DIR || !URL_UNDER_TEST) {
  console.error('walk-runner: need <run-dir> <app-dir> and WALK_URL')
  process.exit(2)
}
if (!TOKEN || !ACCOUNT_ID) {
  console.error('walk-runner: need CLOUDFLARE_API_TOKEN and WALK_CF_ACCOUNT_ID — preflight resolves both')
  process.exit(2)
}

// Resolve the library from the APP's node_modules, never from this script's own
// location. The repo's declared dependency is the thing that means "adopted",
// so it must also be the thing that runs — a second copy resolved from
// somewhere else would run a version the repo never chose. playwright-core is
// the expected package (no bundled browsers — the browser is remote); plain
// playwright still counts, so earlier adopters keep walking.
const require = createRequire(path.join(APP_DIR, 'package.json'))
let chromium
try {
  ;({ chromium } = require('playwright-core'))
} catch {
  try {
    ;({ chromium } = require('playwright'))
  } catch (err) {
    console.error(`walk-runner: cannot load playwright-core (or playwright) from ${APP_DIR}: ${err.message}`)
    process.exit(2)
  }
}

const CDP_ENDPOINT =
  `wss://api.cloudflare.com/client/v4/accounts/${ACCOUNT_ID}/browser-rendering/devtools/browser?keep_alive=600000`

// One session per journey. A refused connection is diagnosed here because the
// two causes read the same from a distance and must not be reported the same:
// an auth refusal (token never widened into Browser Rendering, or the plan's
// browser budget is spent) is exit 4 — infrastructure, never a failing journey.
async function connect() {
  try {
    return await chromium.connectOverCDP(CDP_ENDPOINT, {
      headers: { Authorization: `Bearer ${TOKEN}` },
      timeout: 30_000,
    })
  } catch (err) {
    const msg = String(err && err.message ? err.message : err)
    if (/\b(401|403)\b|Unauthorized|Authentication error/i.test(msg)) {
      console.error('walk-runner: Browser Run refused the token.')
      console.error('Re-run /wong-cloudflare — its widen grants Browser Rendering Edit — or check the plan\'s browser budget.')
      process.exit(4)
    }
    console.error(`walk-runner: could not reach Browser Run: ${msg}`)
    process.exit(2)
  }
}

// Access service-token headers, when the repo has a login wall. Absent is
// normal — most repos are public — so this is silent either way.
const accessHeaders = {}
if (process.env.CF_ACCESS_CLIENT_ID && process.env.CF_ACCESS_CLIENT_SECRET) {
  accessHeaders['CF-Access-Client-Id'] = process.env.CF_ACCESS_CLIENT_ID
  accessHeaders['CF-Access-Client-Secret'] = process.env.CF_ACCESS_CLIENT_SECRET
}

// Is this response the Access login wall rather than the app? Access redirects
// to a `*.cloudflareaccess.com` host, so the final URL is the reliable signal;
// the body check catches a wall served in place without a host change.
function looksLikeAccessChallenge(url, body) {
  if (/\.cloudflareaccess\.com/i.test(url)) return true
  return /cloudflareaccess\.com|Sign in with|__CF\$cv\$params.*access/i.test(body ?? '')
}

// One probe before any journey runs, on a session of its own. Finding the wall
// here costs one page load and produces an honest UNKNOWN; finding it inside a
// journey produces N screenshots of a login form that a grader has to be relied
// upon to notice. The probe is also where a never-widened token surfaces —
// connect() exits 4 before a single journey has spent budget on it.
{
  const probeBrowser = await connect()
  const probeContext = await probeBrowser.newContext({ extraHTTPHeaders: accessHeaders })
  const probe = await probeContext.newPage()
  let body = ''
  try {
    await probe.goto(URL_UNDER_TEST, { waitUntil: 'domcontentloaded', timeout: 30_000 })
    body = await probe.content()
  } catch (err) {
    console.error(`walk-runner: could not reach ${URL_UNDER_TEST}: ${err.message}`)
    await probeBrowser.close()
    process.exit(2)
  }
  const landedOn = probe.url()
  await probeBrowser.close()
  if (looksLikeAccessChallenge(landedOn, body)) {
    process.exit(3)
  }
}

const journeysDir = path.join(RUN_DIR, 'journeys')
const files = (await readdir(journeysDir)).filter((f) => f.endsWith('.mjs')).sort()
const evidence = { url: URL_UNDER_TEST, journeys: [] }

for (const file of files) {
  const mod = await import(pathToFileURL(path.join(journeysDir, file)).href)
  const meta = mod.meta ?? {}
  const id = meta.id ?? path.basename(file, '.mjs')
  const shotDir = path.join(RUN_DIR, 'evidence', id)
  await mkdir(shotDir, { recursive: true })

  const browser = await connect()
  const context = await browser.newContext({
    baseURL: URL_UNDER_TEST,
    viewport: { width: 1280, height: 800 },
    extraHTTPHeaders: accessHeaders,
    recordVideo: { dir: path.join(RUN_DIR, 'video', id), size: { width: 1280, height: 800 } },
  })
  // Playwright's 30s default is tuned for a suite that retries; here every
  // wrong selector spends it in full, inside a walk on a budget. 15s is long
  // enough for a cold Worker plus the round trip to the remote browser, and
  // short enough that a handful of bad guesses still leaves time to walk the
  // rest.
  context.setDefaultTimeout(15_000)
  const page = await context.newPage()

  // Console and page errors are captured as evidence, not as a verdict. A clean
  // console does not make a journey pass, and a noisy one does not make it
  // fail — but a grader reading a screenshot that looks right is better off
  // knowing the page threw while rendering it.
  const consoleErrors = []
  page.on('console', (m) => m.type() === 'error' && consoleErrors.push(m.text()))
  page.on('pageerror', (e) => consoleErrors.push(String(e)))

  const steps = []
  let n = 0
  const step = async (label) => {
    n += 1
    const file = path.join(shotDir, `${String(n).padStart(2, '0')}-${label.replace(/[^a-z0-9]+/gi, '-').toLowerCase()}.png`)
    await page.screenshot({ path: file, fullPage: true })
    steps.push({ n, label, screenshot: file, url: page.url() })
  }

  const record = {
    id,
    requirement: meta.requirement ?? null,
    scenario: meta.scenario ?? null,
    // Verbatim from the spec. The harness treats it as opaque text.
    then: meta.then ?? null,
    steps,
    consoleErrors,
    error: null,
  }

  try {
    await mod.default(page, step)
  } catch (err) {
    // A thrown step is evidence — "the button was never there" is exactly the
    // kind of thing the walk exists to surface — so record it and keep going.
    // A dead session lands here too: the error is this journey's evidence, and
    // the next journey connects fresh. One broken journey must not cost the
    // evidence for every later one.
    record.error = String(err && err.message ? err.message : err)
    try {
      await step('error')
    } catch { /* the page may be gone; the message is the evidence */ }
  }

  try {
    await context.close() // flushes the video
  } catch { /* a dead session has nothing left to flush */ }
  try {
    await browser.close()
  } catch { /* already gone */ }
  const videoDir = path.join(RUN_DIR, 'video', id)
  record.video = existsSync(videoDir)
    ? (await readdir(videoDir)).map((f) => path.join(videoDir, f))[0] ?? null
    : null

  // Re-detect the wall per journey: a mid-walk session expiry would otherwise
  // turn the remaining steps into screenshots of a login form.
  if (record.steps.some((s) => /\.cloudflareaccess\.com/i.test(s.url))) {
    process.exit(3)
  }

  evidence.journeys.push(record)
  console.log(`walked ${id} — ${record.steps.length} steps${record.error ? ` (threw: ${record.error})` : ''}`)
}

await writeFile(path.join(RUN_DIR, 'evidence.json'), JSON.stringify(evidence, null, 2))
console.log(`evidence: ${path.join(RUN_DIR, 'evidence.json')}`)
