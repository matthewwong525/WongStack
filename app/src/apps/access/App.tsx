import { useEffect, useRef } from 'react'
import { useBlocker, useLocation, useNavigate } from 'react-router'
import { appTitle } from '../../lib/apps'
import { mount, type Mounted } from '../../../../.agents/skills/access/screen/main.mjs'

// Access is the access plugin's own page, plain scripts with no build: this mounts it once, tells it when the app's
// router moved, and lets an opened person or role with changes hold any move away, Back and Forward included.
export function App() {
  const box = useRef<HTMLDivElement>(null)
  const page = useRef<Mounted>(null)
  const navigate = useNavigate()
  const leave = useRef(navigate)
  const { key } = useLocation()
  useEffect(() => { leave.current = navigate })
  useEffect(() => {
    const mounted = mount(box.current!, { base: '/api/access/', appTitle, leave: to => void leave.current(to), hosted: true })
    page.current = mounted
    return () => mounted.unmount()
  }, [])
  useEffect(() => { page.current!.update() }, [key])
  const blocker = useBlocker(({ nextLocation }) => page.current!.hold(nextLocation.pathname))
  // The page asks its own question, and moves on itself once the owner answers Leave.
  useEffect(() => { if (blocker.state === 'blocked') blocker.reset() }, [blocker])
  return <div ref={box} />
}
