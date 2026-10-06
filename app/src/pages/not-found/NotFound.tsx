import { Link } from 'react-router'
import { Button } from '@/components/ui/button'

// Any address the route list does not name.
export function NotFound() {
  return (
    <div className="grid max-w-lg justify-items-start gap-4">
      <h1>Page not found</h1>
      <p>Nothing lives at this address.</p>
      <Button asChild variant="outline">
        <Link to="/">Go home</Link>
      </Button>
    </div>
  )
}
