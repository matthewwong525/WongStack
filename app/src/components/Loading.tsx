import type { ReactNode } from 'react'

// A loading state: the words for a screen reader, and grey blocks shaped like what loads for everyone else.
// `className` lays the blocks out like the result, so the page does not jump when it arrives.
export function Loading({ label, className, children }: { label: string; className?: string; children: ReactNode }) {
  return <div role="status">
    <span className="sr-only">{label}</span>
    <div aria-hidden="true" className={className}>{children}</div>
  </div>
}
