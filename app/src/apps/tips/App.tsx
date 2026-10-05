import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { split, type Split } from './tip'

const percents = [10, 15, 18, 20]
const money = (amount: number) => amount.toLocaleString(undefined, { style: 'currency', currency: 'USD' })

// What the result says for the bill as typed: guidance, or each person's share.
function describe(bill: string, out: Split) {
  if (bill === '') return 'Enter the bill amount.'
  if ('error' in out) return out.error
  return (
    <>
      <span className="mb-1 block text-[1.75rem] leading-tight font-bold text-foreground">{money(out.each)} each</span>
      <span className="block">
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
      <h1 className="mb-3">Tip calculator</h1>
      <p className="mb-6 text-muted-foreground">Split a bill and choose a tip.</p>
      <Card className="p-6">
        <div className="grid min-w-0 gap-2">
          <Label htmlFor="tips-bill">Bill</Label>
          <Input
            className="h-11"
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
        <div className="grid min-w-0 gap-2">
          <span className="text-sm leading-none font-medium" id="tips-tip-label">Tip</span>
          <div className="grid grid-cols-4 gap-2" role="group" aria-labelledby="tips-tip-label">
            {percents.map((choice) => (
              <Button
                className="h-11 min-w-0 px-1"
                type="button"
                variant={choice === percent ? 'default' : 'outline'}
                key={choice}
                aria-pressed={choice === percent}
                onClick={() => setPercent(choice)}
              >
                {choice}%
              </Button>
            ))}
          </div>
        </div>
        <div className="grid min-w-0 gap-2">
          <Label htmlFor="tips-people">People</Label>
          <Input
            className="h-11"
            id="tips-people"
            type="number"
            inputMode="numeric"
            min="1"
            step="1"
            value={people}
            onChange={(event) => setPeople(event.target.value)}
          />
        </div>
        <output className="block pt-2 text-muted-foreground wrap-anywhere" aria-live="polite">
          {describe(bill, split({ bill: Number(bill), percent, people: Number(people) }))}
        </output>
      </Card>
    </>
  )
}
