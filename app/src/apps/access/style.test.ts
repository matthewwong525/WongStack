/// <reference types="node" />
import { readFileSync } from 'node:fs'
import { expect, it } from 'vitest'

// Read as files, so this runs outside the browser-like environment the screen tests use.
const read = (path: string) => readFileSync(new URL(path, import.meta.url), 'utf8')

it('fits a phone: the Access and setup styles wrap, and fix no width in pixels', () => {
  for (const file of ['./Access.css', '../../components/AssistantSetup.css', '../../components/CopyText.css']) {
    expect(read(file), file).not.toMatch(/(?:min-)?width:\s*\d+px/)
  }
  const css = read('./Access.css')
  // The buttons, the view switch, the level choice and a row's heading each wrap onto a second line.
  expect(css).toMatch(/\.access-actions, \.access-views, \.access-level-options, \.access-row-head \{[^}]*flex-wrap: wrap/)
  expect(css).toMatch(/\.access-notice \{[^}]*overflow-wrap: anywhere/)
  // A row of labels wraps, a long label breaks, and so does a line under an app's tick.
  for (const part of ['label-row', 'labels', 'app']) expect(css, part).toMatch(new RegExp(`\\.access-${part} \\{[^}]*flex-wrap: wrap`))
  expect(css).toMatch(/\.access-labels li \{[^}]*overflow-wrap: anywhere/)
  expect(css).toMatch(/\.access-fields > label > \* \{[^}]*width: 100%/)
})

it('styles only its own parts, and marks the current view, a level and a gap by more than colour', () => {
  const css = read('./Access.css').replace(/\/\*[\s\S]*?\*\//g, '')
  for (const rule of css.split('}').map(part => part.trim()).filter(Boolean)) {
    for (const selector of rule.split('{')[0].split(',')) expect(selector.trim(), rule).toMatch(/^\.access-/)
  }
  expect(css).toMatch(/\.access-views a\[aria-current="page"\] \{[^}]*font-weight: 700; text-decoration: underline/)
  // The radio buttons stay on screen: the dot shows the choice, and the keyboard can reach it.
  expect(css).toMatch(/\.access-level-options label:has\(:checked\) \{[^}]*font-weight: 600/)
  expect(css).not.toMatch(/input[^{]*\{[^}]*(?:display: none|visibility: hidden|opacity: 0)/)
  // A gap is bold with a bar beside it, and a label has a border: the "!" and the level's words are in the text itself.
  expect(css).toMatch(/\.access-gaps li \{[^}]*border-inline-start: [^;]*solid[^}]*font-weight: 600/)
  expect(css).toMatch(/\.access-labels li \{[^}]*border: [^;]*solid/)
})
