// A plain page's files: the bar's Download saves each, and the link a chat prints (`download=1`) saves them once on
// open. The frame is sealed and can't download, so the app does it. wiki/development/plain-pages.md#a-page-with-files

export type PageFile = { name: string; size: number }
/** A browser asks once to allow several downloads; a gap between them keeps it from dropping one. */
const GAP_MS = 400

/** Where the person's own page `id` serves its file `name`. */
export const pageFileUrl = (id: string, name: string) => `/apps/inbox/api/page-file?${new URLSearchParams({ id, name })}`
/** Where an open team link `token` serves its page's file `name`. */
export const sharedFileUrl = (token: string, name: string) => `/apps/inbox/api/shared-file?${new URLSearchParams({ token, name })}`

/** The query without `download` when it asks for the files, else null: the files download once, and Back, a reload
 *  or Artifacts never download them again. */
export function takeDownload(search: string): string | null {
  const params = new URLSearchParams(search)
  if (params.get('download') !== '1') return null
  params.delete('download')
  return `?${params}`
}

/** Saves `url` as a file, never opening it. */
function saveUrl(url: string) {
  const link = document.createElement('a')
  link.href = url
  link.download = ''
  link.click()
}

/** Saves each of `urls` once, the first at once and the rest a moment apart. */
export function downloadAll(urls: string[], save: (url: string) => void = saveUrl,
  later: (run: () => void, ms: number) => void = (run, ms) => { setTimeout(run, ms) }) {
  urls.forEach((url, n) => { if (n === 0) save(url); else later(() => save(url), n * GAP_MS) })
}

/** What the bar says as the files start: one name, or how many. */
export const downloadingLine = (files: PageFile[]) =>
  files.length === 1 ? `Downloading ${files[0].name}…` : `Downloading ${files.length} files…`
