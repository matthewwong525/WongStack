# 1Password comes with the agent's browser, and the agent signs in with it after your yes

**Status:** ready-to-ship
**Branch:** use-1password-agents
**Open questions:** none

## Why

Today, when a site needs a login, you open a live view and sign in yourself, even when the login sits in your 1Password. You want the agent to sign in for you with your own 1Password, after it tells you what it will do once it is in, and to do no more than that. You also want 1Password in the agent's browser from the start, with nothing for a teammate to set up but their own 1Password sign-in.

1Password's own agent feature, *1Password for Agents*, works only with a few partner apps, and our agents can't join it yet. 1Password's developer keys would mean new parts in your app, so you chose the add-on each person already signs in to.

## What Changes

- **1Password is in the browser from the start.** A new install of the agent's browser comes with the 1Password add-on, with the same checks as when you ask for it. A browser installed before gets it once, at its next start. If you remove it, it stays removed. If you already use another password manager in it, nothing is added.
- **You sign in to 1Password once, as you.** The first time a site needs a login, the agent opens 1Password's sign-in page and sends you the browser. You sign in with your own 1Password account, then fill the site's login, and tap *Hand back*. Your team's shared vaults come with your account, as in your own browser.
- **When 1Password is unlocked, the agent asks, then goes.** When a site needs a login and the unlocked add-on offers one for that site, the agent asks you first. It names the login, the site, and each step it will take once in. After your yes, it picks that login from 1Password, signs in, and does only those steps. Anything else asks you again, and a payment, a delete, or a send still asks its own yes.
  ```text
  Agent: Canva needs a login. Your 1Password has
         "Canva (work)". Once in, I will:
           1. Open the Spring poster
           2. Download it as a PDF
         I won't do anything else there. OK?
  You:   yes
  Agent: Signed in. Downloaded the Spring poster.
  ```
- **When it is locked, you unlock it, as today.** The agent never unlocks 1Password. It opens the sign-in page and sends you the browser; you unlock 1Password, fill the login, and tap *Hand back*. The help page says to set 1Password's auto-lock to 8 hours, so one unlock in the morning lasts the workday.
  ```mermaid
  flowchart TD
    A["Site needs a login"] --> B{"1Password unlocked, with a login for it?"}
    B -- yes --> C["Agent asks: login + steps"]
    C -- "your yes" --> D["Agent picks it, signs in, does only those steps"]
    C -- no --> E["You sign in, Hand back"]
    B -- no --> E
  ```
- **The password never shows.** 1Password fills the site's own sign-in page. The agent reads only the names of the logins 1Password offers for the site, never a password, and its page readings show a filled password box only as filled.

**Non-goals:** *1Password for Agents* (partners only for now); 1Password developer keys or any change to your app; the agent unlocking 1Password or reading anything in it but the logins offered for the current site; another password manager by default.

## What the build needs

- **Unlocking your 1Password once, mid-build**: Ready, the build sends you the browser to sign in or unlock it, so it can test picking a login from it.

## Capabilities

### New Capabilities

### Modified Capabilities

- `password-manager-add-on`: 1Password comes with the browser by default; *The agent never uses the password manager* gives way to the agent picking a login from the unlocked add-on after a yes that names the login and the steps after sign-in; *The person adds an add-on themselves* allows that one pick; the advice becomes an 8-hour auto-lock.
- `browser-logins`: *The person does each login once* and *Sensitive input is typed only on the real site in a live view* allow a login picked from the person's unlocked password manager after their yes.

## Impact

- `.agents/skills/browser/scripts/addons.mjs`: the default 1Password add at install and once at an older browser's start, a saved *removed* state, `addon logins` and `addon pick <n>`.
- `.agents/skills/browser/scripts/browse.mjs`: the guard's one opening for an approved pick; filled boxes hidden from readings.
- `.agents/skills/browser/SKILL.md`: the *Sign in with 1Password* rule.
- `scripts/tests/addons.test.mjs`, `scripts/tests/browse.test.mjs`.
- `wiki/development/password-manager.md`, and one clause in `wiki/development/browsing.md`.
- `openspec/specs/password-manager-add-on/spec.md` and `openspec/specs/browser-logins/spec.md`, through the deltas.
- `CHANGELOG.md`: a minor entry.

## Decision log

- **2026-11-11** — Asked how the agent should fill logins from 1Password: *1Password for Agents* (partners only), the agent clicking fill in the add-on, or our own fill step from a vault → chose our own fill step.
- **2026-11-11** — Asked whether this computer's own tool keys move into 1Password too → chose not now.
- **2026-11-11** — Asked whether the agent asks before a fill → chose: it reads your own team vault, then asks you first ("it should be able to access our own vault and then ask us"). Superseded below for team vaults.
- **2026-11-11** — Asked who uses the vault → chose every teammate's agent, with the key in the app.
- **2026-11-11** — Asked (the person, unprompted): the ask outlines what the agent will do once signed in, and it does no more → the ask lists the steps, anything outside them asks again, and the end report names the steps done.
- **2026-11-11** — Asked whether to test before planning → chose test first. A service account key read the *Agent Test* vault and filled its login into a test page in the agent's browser; the page confirmed both values, and neither the snapshot nor the chat held the password. A first key saw no vault: adding a vault to it later did not work, so a new service account was made.
- **2026-11-11** — Assumed: "our own vault" means a team vault you make, not *Personal*, *Private*, or the default *Shared*, because 1Password refuses service-account access to those.
- **2026-11-11** — Assumed: the app runs 1Password's toolkit and hands one login to the asking computer's browser code, because every teammate uses it and a teammate's computer holds no business key; this is a stated exception to "never copy a saved business key to an employee": the 1Password key itself never leaves the app.
- **2026-11-11** — Assumed: the code enforces what it can (the login's saved site must match the page, values never printed, hidden from page reads) and the step list is the agent's rule plus its end report, because free-form steps can't be checked by code.
- **2026-11-11** — Assumed: once signed in, later tasks reuse the browser's session as today, with no new ask, because a saved session is how every sign-in works now; a new ask comes only when a fill is needed again.
- **2026-11-11** — Assumed: a scheduled run that needs a fill asks in its chat and waits, because the yes is the person's.
- **2026-11-11** — Assumed: each use is recorded in the Worker's logs (who, which login, which site), with no new screen, because a screen is a separate ask.
- **2026-11-11** — Assumed: the first build step checks that the toolkit runs in the app and fits its size limit, and stops for the person if not, because the toolkit's WASM file loads from disk in Node and the Worker can't do that.
- **2026-11-11** — Asked (review) whether to use several 1Password keys, each reading different vaults → chose one key per team, *Creatives* and *Operations*, kept in the app and given out by app role, so a teammate only signs in and sets up nothing ("i'd like for them to just login and have it already set up"); a teammate fills other logins by hand with the add-on.
- **2026-11-11** — Asked (review) what happens to the 1Password add-on → chose keep it.
- **2026-11-11** — Assumed (review): the keys stay in the app rather than going to each computer, because a role change or removal then works at once; a key copied to a computer works until the owner makes a new one.
- **2026-11-11** — Assumed (review): each team key is its own registry key, and a new team is a small change the agent makes on the owner's ask, because the app gives a built action only keys declared in code; the action reads every 1Password key the caller has Read on.
- **2026-11-11** — Asked (review) whether team-vault logins need a yes → chose no: "for the agent ones, it should just auto use it without asking if they have permission". The agent names the login used and the steps done at the end; outward actions keep their own yes.
- **2026-11-11** — Asked how the agent uses the person's own 1Password add-on → chose: when it is locked, open the sign-in page and the person signs in and taps *Hand back*, as today; "if 1 password is already logged in then we ask and just go and execute on it". So the ask with the steps after sign-in now belongs to the add-on fill.
- **2026-11-11** — Assumed: "already logged in" means the add-on is unlocked and offers a login for the site, and the agent never unlocks it, because unlocking needs the person's own password.
- **2026-11-11** — Assumed: the add-on fill is checked by a test in Camoufox first, and falls back to the person's sign-in turn if the agent can't read the fill list's login names or pick one, because 1Password's in-page list is its own frame the guard hides today.
- **2026-11-11** — Asked (review): after hearing that a small fill program of ours would type service-key logins → chose the 1Password add-on only: "no service account key just their login and also have it so 1password by default is installed with this browser". This drops the team keys, app roles, app actions, and the toolkit-in-the-app risk above.
- **2026-11-11** — Asked when the agent asks before using a login from the add-on → chose every time, naming the login, the site, and the steps after sign-in.
- **2026-11-11** — Asked what auto-lock the help page advises → chose 8 hours, replacing today's 5 minutes.
- **2026-11-11** — Assumed: 1Password is added at a new browser install and once at an older browser's next start, never again after the person removes it, and not when another password manager is already added, because "by default" should not override a choice the person made.
- **2026-11-11** — Assumed: the person signs in to 1Password at the first sign-in turn that needs it, not at install, because the install happens inside an errand and a sign-in is the person's turn anyway.
- **2026-11-11** — Assumed: the test service account key stays in this computer's `.env` until the person says to delete it, because removing a key can't be undone; the plan uses it for nothing.
- **2026-11-11** — Tested (1.1): the browser's real 1Password, unlocked with a test login for `127.0.0.1`, showed its fill list on a local test page, a keyboard pick filled it, and the page's sha256 check confirmed the fill with no value printed. Reading entry names from the frame and clicking one, through a closed shadow root, worked in Camoufox with a stand-in add-on built like 1Password's list; the live run (2.5) checks both on the real one.
- **2026-11-11** — Assumed (build): `addon logins` names each entry by its visible lines joined with ` · ` (title, then username), because a person tells two logins for one site apart by the username.
- **2026-11-11** — Assumed (build): with no username box on the page, the list opens from the password box, because a two-step sign-in shows the password box alone.
- **2026-11-11** — Assumed (build): `addon pick` waits for the person's turn like a click, and a refused or expired pick needs a new `addon logins`, because a pick changes the page.
- **2026-11-11** — Assumed (build): the guard also refuses a key press while focus is inside an add-on's frame, such as 1Password's own prompt, because the old check missed focus inside a closed shadow root.
- **2026-11-11** — Assumed (build): `browse.mjs install` prints nothing about the default add, and an asked-for password manager still opens its page at once, because the default add is not the person's ask.
- **2026-11-11** — Assumed (review): the agent gives the 8-hour auto-lock advice in the note of the first sign-in turn for 1Password, the `addon open` turn in the *Sign in with 1Password* rule, because the default add happens with no chat turn to tell it in.
- **2026-11-11** — Assumed (review): while a password manager's frame shows on the page, the guard refuses every key but Escape, and typing with Enter, because arrow keys and Enter in the page's own login box pick from 1Password's fill list without `addon pick`.
- **2026-11-11** — Assumed (review): an older version's `declined` answer counts as a remove for the default add, because it was the person's no to a password manager.
- **2026-11-11** — Assumed (review): an install while the browser runs makes no default add, so it never stops another chat's browser, and the next start adds it.
- **2026-11-11** — Assumed (review): the default add's first site call gives up after 8 seconds, and a failed try waits a day, because the add runs before each start and a dead network would otherwise slow every start by two minutes.
- **2026-11-11** — Assumed (review): `addon pick` reports a fill only when a box changed and a shown password box holds a value (a hidden one, as on Google's email step, does not count), or a login on a 2-step sign-in, compared inside the page, because a pre-filled email alone looked like a fill.
- **2026-11-11** — Check: `scripts/tests/browse.test.mjs` *saved logins are gone* now looks for a top-level `login`, `logins`, or `forget` command in the help, not any use of the word, because `addon logins` names the add-on's list; the fixture's answer file is `fill-list`, not the retired `logins.json`.
- **2026-11-12** — Tested (2.5): with the browser's real 1Password unlocked, `addon logins` on a local test page read the one offered login's name, `addon pick 1` printed `filled`, the page's check confirmed the sign-in, and the password showed only as `[hidden]`. A second pick without a new `addon logins` was refused, and `press ArrowDown` and `press Enter` were refused while the fill list showed. 1Password itself submitted the form after the fill (its own setting), so the agent's later click on sign-in was a second submit.
- **2026-11-12** — Saved after the live test (2.5) passed, for the CI run in 4.2; the separate cut-off live view on a phone was fixed in its own change (#578).
