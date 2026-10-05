import { useId } from 'react'
import type { Level } from '../../lib/access'
import { levelName } from './levels'

/** One level as a segmented choice. Real radio buttons: arrow keys move it, and the dot marks the current one. */
export function LevelChoice({ legend, levels, value, note, onChange }: {
  legend: string; levels: Level[]; value: Level | null; note?: string; onChange: (level: Level | null) => void
}) {
  const name = useId()
  return <fieldset className="access-levels">
    <legend>{legend}</legend>
    <div className="access-level-options">{[null, ...levels].map(level => <label key={levelName(level)}>
      <input type="radio" name={name} checked={value === level} onChange={() => onChange(level)} />{levelName(level)}
    </label>)}</div>
    {note && <p className="access-muted">{note}</p>}
  </fieldset>
}
