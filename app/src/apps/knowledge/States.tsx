import { Button } from '@/components/ui/button'

/** The screen on an app with no knowledge repository, as every preview is. */
export function NotSetUp() {
  return <div className="grid gap-2">
    <h1>Knowledge</h1>
    <p>Knowledge is not set up yet.</p>
    <p className="text-muted-foreground">The live app reads the company's knowledge pages. A preview has none.</p>
  </div>
}

/** A read that failed, and a way to try it again. */
export function Failed({ what, retry }: { what: string; retry: () => void }) {
  return <div role="alert" className="grid justify-items-start gap-3">
    <p>{what} could not be loaded.</p>
    <Button type="button" variant="outline" onClick={retry}>Try again</Button>
  </div>
}
