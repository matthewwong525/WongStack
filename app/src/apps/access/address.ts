import { z } from 'zod'
import type { Status } from '../../lib/access'

/** An address inside Access: `at()` is People, `at('roles')` a view, `at('roles', id)` one role beside its list. */
export const at = (...parts: string[]) => `/apps/access/${parts.map(encodeURIComponent).join('/')}`

/** The owner's three views, in the order the switch shows them. People opens first. */
export const VIEWS = [
  { name: 'people', title: 'People', home: at() },
  { name: 'roles', title: 'Roles', home: at('roles') },
  { name: 'services', title: 'Services', home: at('services') },
] as const

/** The id of a view's name in the switch: the list under the switch is labelled by it. */
export const viewLabel = (view: (typeof VIEWS)[number]) => `access-view-${view.name}`

/** What the last change came to, as it rides with the address it led to: the words, whether it failed, for a role
 *  picked in the list, the save that puts the person back, and for a person just added, their email to welcome. */
export const saidSchema = z.object({ text: z.string(), failed: z.boolean(), undo: z.record(z.string(), z.unknown()).optional(), welcome: z.string().optional() })
type Said = z.infer<typeof saidSchema>

/** What a view, and each item opened in it, is handed: the one status read, the last change, and the one way to save.
 *  `done` replaces the words a finished save is said with, and may carry its undo or the person to welcome. */
export type ViewProps = { status: Status; id: string; view: (typeof VIEWS)[number]; pending: boolean; said?: Said
  save: (path: 'people' | 'roles' | 'retry', body?: object, done?: Pick<Said, 'text' | 'undo' | 'welcome'>) => void; reload: () => void }
