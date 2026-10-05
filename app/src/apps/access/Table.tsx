import { useId, type ReactNode } from 'react'
import { useNavigate } from 'react-router'

/** The frame of a list: its title, the add spot on the right, then a table whose columns every row shares.
 *  `actions` names a last column of row menus, for a screen reader alone. With `empty`, that is said in the table's place. */
export function Table({ title, add, columns, actions, empty, children }: {
  title: string; add: ReactNode; columns: string[]; actions?: string; empty?: ReactNode; children: ReactNode
}) {
  const id = useId()
  return <>
    <div className="access-row-head"><h2 id={id}>{title}</h2>{add}</div>
    {empty || <table className="access-table" aria-labelledby={id}>
      <thead><tr>
        {columns.map(column => <th scope="col" key={column}>{column}</th>)}
        {actions && <th scope="col"><span className="access-hidden">{actions}</span></th>}
      </tr></thead>
      <tbody>{children}</tbody>
    </table>}
  </>
}

/** One row. With `to`, a click anywhere on it that is not a control opens that page, as the link in its first cell does. */
export function Row({ to, children }: { to?: string; children: ReactNode }) {
  const navigate = useNavigate()
  return <tr className={to ? 'access-opens' : undefined}
    onClick={event => { if (to && !(event.target as Element).closest('a, button, select, details')) void navigate(to) }}>{children}</tr>
}
