import { Button } from '@/components/ui/button'

/** The bar under the decisions: how many are picked, and one Send for all of them, which says how many agents it starts
 *  while plan cards are on Go. The key hint shows on a computer. */
export function SendBar({ picked, total, starts, sending, onSend }: { picked: number; total: number; starts: number; sending: boolean; onSend: () => void }) {
  const label = starts > 0 ? `Start ${starts} ${starts === 1 ? 'agent' : 'agents'}` : picked === 1 ? 'Send 1 answer' : `Send ${picked} answers`
  return <div className="sticky bottom-0 grid gap-1 border-t bg-background py-3">
    <div className="flex items-center gap-3">
      <p className="flex-1 text-sm text-muted-foreground" role="status">{picked} of {total} picked</p>
      <Button type="button" disabled={picked === 0 || sending} onClick={onSend}>{label}</Button>
    </div>
    <p className="hidden text-xs text-muted-foreground md:block">
      <kbd>J K</kbd> move · <kbd>1–6</kbd> pick and go on · <kbd>N</kbd> type an answer · <kbd>Z</kbd> clear · <kbd>Ctrl/⌘ Enter</kbd> send
    </p>
  </div>
}
