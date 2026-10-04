// Every mini app in this build, compiled into the page: app/src/apps/ finds and
// checks them, so the home page needs no fetch.
import { apps, type MiniApp } from '../apps'
export { apps, type MiniApp }

/** An app's title for a person to read; a name with no built app shows as it is. */
export const appTitle = (name: string) => apps.find(app => app.name === name)?.title ?? name
