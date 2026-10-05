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
  // The buttons, the view switch, the level choice and a view's title row each wrap onto a second line, and so does the heading's own row.
  expect(css).toMatch(/\.access-top \{[^}]*flex-wrap: wrap/)
  expect(css).toMatch(/\.access-actions, \.access-views, \.access-level-options, \.access-row-head \{[^}]*flex-wrap: wrap/)
  expect(css).toMatch(/\.access-notice \{[^}]*overflow-wrap: anywhere/)
  // A row of labels wraps, a long label breaks, and so does a line under an app's tick.
  for (const part of ['label-row', 'labels', 'app']) expect(css, part).toMatch(new RegExp(`\\.access-${part} \\{[^}]*flex-wrap: wrap`))
  expect(css).toMatch(/\.access-labels li \{[^}]*overflow-wrap: anywhere/)
  expect(css).toMatch(/\.access-fields > label > \* \{[^}]*width: 100%/)
  // The popup for connecting an assistant is never wider or taller than the screen, and the dropdown it replaced is gone.
  expect(css).toMatch(/\.access-popup \{[^}]*width: min\(\d+rem, 100vw - \d+rem\);[^}]*max-height: calc\(100vh - \d+rem\)/)
  expect(css).not.toMatch(/access-connect/)
})

it('lists are tables whose rows stack on a narrow screen, with nothing scrolling sideways', () => {
  const css = read('./Access.css')
  // The page measures itself, so the rows stack by the room they have; the wider page never passes the screen.
  expect(css).toMatch(/\.access-page \{[^}]*container-type: inline-size/)
  expect(css).toMatch(/\.access-wide \{[^}]*width: min\(\d+rem, 100vw - \d+rem\)/)
  const stacked = css.match(/@container \(max-width: [\d.]+rem\) \{([\s\S]*?\})\s*\}/)![1]
  expect(stacked).toMatch(/\.access-table, \.access-table tbody, \.access-table td \{[^}]*display: block/)
  expect(stacked).toMatch(/\.access-table tbody tr \{[^}]*display: grid/)
  // The header row stays for a screen reader, and a cell shows its column's name where its words don't say it.
  expect(stacked).toMatch(/\.access-table thead \{[^}]*position: absolute/); expect(css).not.toMatch(/thead[^{]*\{[^}]*(?:display: none|visibility: hidden)/)
  expect(stacked).toMatch(/\.access-table td\[data-label\]::before \{[^}]*content: attr\(data-label\)/)
  // Cells break a long word and no row is boxed: a line divides the rows.
  expect(css).toMatch(/\.access-table th, \.access-table td \{[^}]*overflow-wrap: anywhere/)
  expect(css).toMatch(/\.access-table tbody tr \{[^}]*border-block-start: [^;]*solid/)
  expect(css).not.toMatch(/overflow-x/)
})

it('styles only its own parts, and marks the current view, a level and a gap by more than colour', () => {
  // The rule that stacks rows wraps its own rules: each selector inside it is checked like any other.
  const css = read('./Access.css').replace(/\/\*[\s\S]*?\*\//g, '').replace(/@container[^{]*\{/g, '')
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
