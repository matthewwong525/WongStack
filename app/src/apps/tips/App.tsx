import { useState } from 'react'
import { split, type Split } from './tip'
import './Tips.css'

const percents = [10, 15, 18, 20]
const money = (amount: number) => amount.toLocaleString(undefined, { style: 'currency', currency: 'USD' })

// What the result says for the bill as typed: guidance, or each person's share.
function describe(bill: string, out: Split) {
  if (bill === '') return 'Enter the bill amount.'
  if ('error' in out) return out.error
  return (
    <>
      <span className="tips-each">{money(out.each)} each</span>
      <span className="tips-detail">
        Tip {money(out.tip)} · Total {money(out.total)}
      </span>
    </>
  )
}

// Splits a bill as you type: each change recalculates at once.
export function App() {
  const [bill, setBill] = useState('')
  const [percent, setPercent] = useState(15)
  const [people, setPeople] = useState('1')

  return (
    <>
      <h1 className="tips-title">Tip calculator</h1>
      <p className="tips-description">Split a bill and choose a tip.</p>
      <div className="tips-calculator">
        <div className="tips-field">
          <label className="tips-label" htmlFor="tips-bill">Bill</label>
          <input
            className="tips-input"
            id="tips-bill"
            type="number"
            inputMode="decimal"
            min="0"
            step="0.01"
            placeholder="0.00"
            autoFocus
            value={bill}
            onChange={(event) => setBill(event.target.value)}
          />
        </div>
        <div className="tips-field">
          <span className="tips-label" id="tips-tip-label">Tip</span>
          <div className="tips" role="group" aria-labelledby="tips-tip-label">
            {percents.map((choice) => (
              <button
                className="tips-percent"
                type="button"
                key={choice}
                aria-pressed={choice === percent}
                onClick={() => setPercent(choice)}
              >
                {choice}%
              </button>
            ))}
          </div>
        </div>
        <div className="tips-field">
          <label className="tips-label" htmlFor="tips-people">People</label>
          <input
            className="tips-input"
            id="tips-people"
            type="number"
            inputMode="numeric"
            min="1"
            step="1"
            value={people}
            onChange={(event) => setPeople(event.target.value)}
          />
        </div>
        <output className="tips-result" aria-live="polite">
          {describe(bill, split({ bill: Number(bill), percent, people: Number(people) }))}
        </output>
      </div>
    </>
  )
}
