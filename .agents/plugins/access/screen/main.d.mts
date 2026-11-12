/** What the host passes to the Access page. Every field has a default. */
export interface MountOptions {
  /** The Access API's address. Default `/api/access/`. */
  base?: string
  /** The page's own address, where its views live. Default `/apps/access/`. */
  home?: string
  /** An app's name for a person, by its id. Default: the id. */
  appTitle?: (id: string) => string
  /** Goes to an address outside Access. Default: the browser loads it. */
  leave?: (to: string) => void
  /** True when the host's router holds Back and Forward through `hold`; the page then leaves them to it. Default false. */
  hosted?: boolean
}

/** The drawn page, for the host. */
export interface Mounted {
  /** Reads the address again, after the host moved it. */
  update(): void
  /** True once an open item with changes has asked before a move to `to`: the host then holds the move. */
  hold(to: string): boolean
  /** Removes the page. */
  unmount(): void
}

export function mount(element: Element, options?: MountOptions): Mounted
