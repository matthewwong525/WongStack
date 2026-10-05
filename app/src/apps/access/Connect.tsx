import { useRef, useState } from 'react'
import { AssistantSetup } from '../../components/AssistantSetup'

// For whoever manages Access: a button beside the heading, and the steps in a popup over the page. The browser
// keeps the keyboard inside the popup and closes it on Escape; a click outside its box lands on the popup's own
// backdrop, and closes it too. The steps load when it opens.
export function Connect() {
  const popup = useRef<HTMLDialogElement>(null)
  const [open, setOpen] = useState(false)
  return <>
    <button type="button" onClick={() => { setOpen(true); popup.current?.showModal() }}>Connect your assistant</button>
    <dialog ref={popup} className="access-popup" aria-label="Connect your assistant" onClose={() => setOpen(false)}
      onClick={event => { if (event.target === event.currentTarget) event.currentTarget.close() }}>
      {open && <div className="access-popup-box">
        <AssistantSetup />
        <button type="button" onClick={() => popup.current?.close()}>Close</button>
      </div>}
    </dialog>
  </>
}
