import type { ReactNode } from 'react'

const ADDRESS = /https?:\/\/[^\s<>"]+/g
// Punctuation that ends a sentence, or closes a bracket around the address, is not part of it.
const TRAILING = /[.,;:!?)]+$/

/** `text` with each web address as a link that opens in a new tab and picks nothing; React escapes the rest. */
export function linkify(text: string): ReactNode[] {
  const parts: ReactNode[] = []
  let at = 0
  for (const match of text.matchAll(ADDRESS)) {
    const url = match[0].replace(TRAILING, '')
    parts.push(text.slice(at, match.index), <a key={match.index} href={url} target="_blank" rel="noopener noreferrer"
      className="underline underline-offset-2 wrap-anywhere" onClick={event => event.stopPropagation()}>{url}</a>)
    at = match.index + url.length
  }
  return [...parts, text.slice(at)]
}
