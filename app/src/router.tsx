import type { RouteObject } from 'react-router'
import { Layout } from './Layout'
import { AppPage } from './apps/AppPage'
import { Home } from './pages/home/Home'
import { NotFound } from './pages/not-found/NotFound'

// Every page, in one list. A new page is a folder in pages/ and one entry here;
// a mini app is a folder in apps/ and needs no entry.
export const routes: RouteObject[] = [
  {
    element: <Layout />,
    children: [
      { index: true, element: <Home /> },
      { path: 'apps/:name/*', element: <AppPage /> },
      { path: '*', element: <NotFound /> },
    ],
  },
]
