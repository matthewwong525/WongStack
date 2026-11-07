# Design

## Context

See proposal.md for why. `D checkins off` writes `<state>/off` and stops the worker; `D checkins on` removes it. `D ensure` runs at each chat start: it starts `schedule.mjs defaults --unattended` detached through `startDefaults` when `defaults.json`'s `stamp` differs from the shipped list's hash or a day passed, then, with the off file present, takes waiting schedule runs and `refuseRuns` reports each `blocked` / `checkins_off`. `addDefaults` (`schedule/scripts/lib/defaults.mjs`) treats a default as untouched only when `held.state === 'on'` and its version and timing equal the `added[key]` this computer last saved, so today a paused default reads as the person's.

## Goals / Non-Goals

**Goals:** an untouched default is paused in the app while check-ins are off on this computer, and resumed when they go on; a computer already off pauses at its first chat after the update; a person's pause, edit, end or resume always wins.

**Non-Goals:** the person's own schedules; the Inbox (it already shows *Paused*); hiding `checkins_off` runs.

## Decisions

### `addDefaults` applies the off state, at each flip

`addDefaults` takes `off` (the off file exists; the `defaults` command passes it from `stateOf`). `defaults.json` gains `off`: the state it last applied, and `added[key].checkins: true` on a default it paused for check-ins, or `'owed'` while that pause has not landed yet, so a failed pause is tried again at the next pass. After the add/update step, for each default:

- **Off now, and `off` was not applied** (the flip, or a computer off before this update): an untouched default that is `on` is paused (`send(client, 'pause')`) and marked. A default added while off is saved paused and marked, as an install's `off` entry is.
- **On now, and marked:** a held state `paused` at the kept version is resumed (`send(client, 'resume')`); the mark goes either way.
- **Off, already applied, marked, but held `on`:** the person resumed it; the mark goes, and nothing pauses it again until the next flip.

`choice()` counts a marked default held `paused` as untouched, so an update while off still saves WongStack's new version; the save is followed by a pause when the saved schedule comes back `on`. Then `addDefaults` writes `off`.

*Alternative:* report `checkins_off` runs as quiet, like `no_work`. Rejected: the helper would still claim a run every 5 minutes, and the person asked for the schedule to wait paused, which the Inbox already shows.

*Alternative:* pause at every pass while off. Rejected: it would undo a resume the person made while check-ins are off.

### The flip starts `defaults` at once; the stamp catches a missed one

`startDefaults` stamps `listStamp(list)` plus `:off` when the off file exists, so `D ensure` starts `defaults` whenever the off state differs from the one last started for, including on a computer that was off before this update. `D checkins off` and `D checkins on` call `startDefaults` right after they write or remove the off file, so the pause lands without waiting for a chat start. With no app sign-in, `defaults` already adds nothing and journals it once a day; the stamp then waits for the next day or flip.

## Risks / Trade-offs

- [The flip's run fails, for example the app is down] → the stamp was written, so the next day's `D ensure` retries; meanwhile runs are refused as today.
- [The person pauses a default by hand while it is marked] → it is already paused; at check-ins on, `defaults` resumes it. Accepted: the mark says check-ins paused it, and the Inbox can't tell the two pauses apart; the person pauses it again.
- [Two computers] → a background schedule is held for one computer, so a pause on one never touches another's.

## Migration Plan

Nothing to move. On a computer whose check-ins are off, the first chat after the update sees a new stamp, starts `defaults`, and pauses both untouched defaults. Rollback: a revert; a default left paused is resumed in the Inbox.
