// One mini app, as the build writes it to /apps/apps.json (scripts/mini-dashboard.mjs).
export type MiniApp = { name: string; title: string; description: string; href: string }

// The list, or null when it could not load.
export function loadApps(): Promise<MiniApp[] | null> {
  return fetch('/apps/apps.json')
    .then((response) => (response.ok ? response.json() : Promise.reject(response)))
    .catch(() => null)
}
