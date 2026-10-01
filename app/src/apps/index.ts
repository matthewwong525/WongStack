import { createElement, lazy, Suspense, type ComponentType, type ReactElement } from 'react'

// Every mini app, found by folder: app/src/apps/<name>/ holds its page
// (App.tsx, exporting `App`) and its card on the home page (app.json, with a
// title and a description). A new app needs no edit here. wiki/stack/mini-apps.md
export type MiniApp = { name: string; title: string; description: string; href: string }

type Manifest = { title?: unknown; description?: unknown }

// A folder name is an address: lowercase letters and digits, joined by hyphens.
const NAME = /^[a-z0-9]+(-[a-z0-9]+)*$/

// "./hello/app.json" → "hello"
const folderOf = (path: string) => path.split('/')[1]

const text = (value: unknown) => (typeof value === 'string' && value.trim() !== '' ? value : null)

/**
 * The checked list, sorted by name. Throws, naming the folder, on a bad name, a
 * missing page or app.json, or an app.json without a title or a description,
 * so the `test` check fails before a broken card reaches the home page.
 */
export function listApps(manifests: Record<string, unknown>, pages: string[]): MiniApp[] {
  const names = new Set([...Object.keys(manifests), ...pages].map(folderOf))
  return [...names].sort().map((name) => {
    const fail = (problem: string) => new Error(`app/src/apps/${name}: ${problem}`)
    if (!NAME.test(name)) throw fail('name the folder with lowercase letters, digits, and hyphens.')
    if (!pages.includes(`./${name}/App.tsx`)) throw fail('add App.tsx, exporting the page as `App`.')
    const manifest = manifests[`./${name}/app.json`] as Manifest | undefined
    if (!manifest) throw fail('add app.json with a title and a description.')
    const title = text(manifest.title)
    if (!title) throw fail('app.json needs a title.')
    const description = text(manifest.description)
    if (!description) throw fail('app.json needs a description.')
    return { name, title, description, href: `/apps/${name}/` }
  })
}

// Vite resolves both globs at build time and in the tests: the cards are read
// now, and each page loads only when someone opens it.
const manifests = import.meta.glob('./*/app.json', { eager: true, import: 'default' })
const loaders = import.meta.glob<{ App: ComponentType }>('./*/App.tsx')

export const apps = listApps(manifests, Object.keys(loaders))

const pages = new Map(
  Object.entries(loaders).map(([path, load]) => [
    folderOf(path),
    lazy(() => load().then((module) => ({ default: module.App }))),
  ]),
)

/** The page of the app in folder `name`, ready to render, or null when there is none. */
export function appPage(name: string): ReactElement | null {
  const page = pages.get(name)
  return page ? createElement(Suspense, { fallback: null }, createElement(page)) : null
}
