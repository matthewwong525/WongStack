import type { Status } from '../../lib/access'

/** An address inside Access: `at()` is People, `at('roles')` a view, `at('roles', id)` one role's page. */
export const at = (...parts: string[]) => `/apps/access/${parts.map(encodeURIComponent).join('/')}`

/** The owner's four views, in the order the switch shows them. People opens first. */
export const VIEWS = [
  { name: 'people', title: 'People', home: at() },
  { name: 'roles', title: 'Roles', home: at('roles') },
  { name: 'apps', title: 'Apps', home: at('apps') },
  { name: 'keys', title: 'Keys', home: at('keys') },
] as const

/** What a view, and each page under it, is handed: the one status read, and the one way to save. */
export type ViewProps = { status: Status; id: string; view: (typeof VIEWS)[number]; pending: boolean
  save: (path: 'people' | 'roles' | 'grants' | 'retry', body?: object) => void; reload: () => void }
