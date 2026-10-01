import { useParams } from 'react-router'
import { NotFound } from '../pages/not-found/NotFound'
import { appPage } from '.'

// The page of the mini app the address names, /apps/<name>/, or Page not found.
export function AppPage() {
  return appPage(useParams().name!) ?? <NotFound />
}
