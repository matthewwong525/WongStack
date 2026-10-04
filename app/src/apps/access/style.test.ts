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
  expect(css).toMatch(/\.access-actions \{[^}]*flex-wrap: wrap/)
  expect(css).toMatch(/\.access-notice \{[^}]*overflow-wrap: anywhere/)
  expect(css).toMatch(/input\[type="email"\] \{[^}]*width: 100%/)
})
