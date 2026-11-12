# Prototypes

A prototype is a throwaway copy of the app that a plan changes and draws, so the plan's card shows real *Before* and *After* pictures, not a sketch. [Review pages](review-pages.md#the-prototype) owns what a card shows; this page owns how you make its pictures. Part of [the WongStack wiki](README.md).

[`prototype.mjs`](../.agents/plugins/loop/skills/plan/scripts/prototype.mjs) runs the copy's steps. No step needs a go from the person, and git never takes the copy.

## Make the copy

[The plan's prototype rules](../.agents/plugins/loop/skills/plan/references/prototypes.md) own every step. In WongStack, the copy adds no file in `schema/migrations`, because the preview shares the practice database.

## A web app

[The plan's prototype rules](../.agents/plugins/loop/skills/plan/references/prototypes.md#a-web-app) own the route. *Before* is a screenshot of today's screen, taken as the person with [the browser](../.agents/plugins/browser/references/browsing.md).

## An app the preview can't serve

A phone app, a desktop app, or any app the browser can't open is drawn by its own screen test: [the plan's prototype rules](../.agents/plugins/loop/skills/plan/references/prototypes.md#an-app-the-preview-cant-serve) own the steps.

### The repo's own steps

Each test kit runs differently, so each repo writes its own steps once, in a page that a path rule, `.agents/rules/<app>.md`, names for the app's folder. It is [repeatable knowledge](wiki-style.md#repeatable-knowledge). Example: Relay Everything keeps its Flutter steps in `wiki/development/phone-pictures.md`, with `.agents/rules/mobile.md` pointing at it; a picture takes about 2 seconds, with no phone.

## What no test can draw

A screen test can't draw the system's own parts, such as the keyboard or the share sheet: [the plan's prototype rules](../.agents/plugins/loop/skills/plan/references/prototypes.md#an-app-the-preview-cant-serve) say how to show them.

## Notes and the build

Notes change the copy too. [`/apply`](../.agents/plugins/loop/skills/apply/SKILL.md#build-in-a-helper) keeps the copy's edits as a diff, and [its build](../.agents/plugins/loop/skills/apply/references/build-helper.md) reads it first. A website this app doesn't run has its own route: [a website prototype](review-pages.md#a-website-prototype).

## When every way fails

Only when no route draws the screen, the `screen` sketch stays, with a line `No real picture: <the step that failed>`; [the drawing guide](../.agents/plugins/loop/skills/plan/references/drawings.md) says how to write it.
