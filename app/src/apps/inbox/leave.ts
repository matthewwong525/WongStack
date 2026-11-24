// A sealed page that loads another address into its own frame starts again, as the review page's live card does.
// wiki/development/plain-pages.md#why-and-edge-cases

/** A frame's loads since it last started, and how many times its page left. */
export type Leaving = { loads: number; tries: number }
export const START: Leaving = { loads: 0, tries: 0 }
const TRIES = 3

/** The count after one more load. The first is the page; a later one means it left: start again, one more try. */
export const afterLoad = ({ loads, tries }: Leaving): Leaving => loads === 0 ? { loads: 1, tries } : { loads: 0, tries: tries + 1 }

/** After three tries the frame shows no more, so a page can't loop forever. */
export const stopped = (tries: number) => tries >= TRIES

/** The line over the frame once its page left, or null while it stays. */
export const leaveLine = (tries: number) => tries === 0 ? null
  : stopped(tries) ? 'This page keeps trying to leave. Reload to try again.' : 'This page tried to leave the page.'
