import { Suspense } from 'react'
import { useParams } from 'react-router'
import { NotFound } from '../pages/not-found/NotFound'
import { pageFor } from '.'

// The page of the mini app the address names, /apps/<name>/, or Page not found.
export function AppPage() {
  const Page = pageFor(useParams().name!)
  if (!Page) return <NotFound />
  return (
    <Suspense fallback={null}>
      <Page />
    </Suspense>
  )
}
