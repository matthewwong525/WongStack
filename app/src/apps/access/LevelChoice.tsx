import { useId } from 'react'
import { Label } from '@/components/ui/label'
import type { Level } from '../../lib/access'
import { levelName } from './levels'

/** One level as a segmented choice in one row that wraps. Real radio buttons, kept on screen: arrow keys move it,
 *  and the dot marks the current one, with its words in bold. `names` words the levels: a key's unless an area's
 *  are given. `mark` is a word beside the row, such as `new` for a level a starting point raised. */
export function LevelChoice({ legend, levels, value, names = levelName, mark, notes = [], onChange }: {
  legend: string; levels: Level[]; value: Level | null; names?: (level: Level | null) => string; mark?: string | false; notes?: string[]
  onChange: (level: Level | null) => void
}) {
  const name = useId()
  return <fieldset className="grid min-w-0 gap-1.5">
    <legend className="mb-1 text-sm">{legend}</legend>
    <div className="flex flex-wrap items-center">{[null, ...levels].map(level =>
      <Label className="-ms-px cursor-pointer border px-3 py-2 font-normal first:ms-0 first:rounded-s-md last:rounded-e-md has-checked:bg-secondary has-checked:font-semibold" key={names(level)}>
        <input type="radio" className="size-4 accent-primary" name={name} checked={value === level} onChange={() => onChange(level)} />{names(level)}
      </Label>)}
      {mark && <strong className="ms-2.5 text-sm font-semibold">{mark}</strong>}
    </div>
    {notes.filter(Boolean).map(note => <p className="text-sm text-muted-foreground" key={note}>{note}</p>)}
  </fieldset>
}
