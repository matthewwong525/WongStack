import { DownloadIcon } from 'lucide-react'
import { useCallback, useEffect, useRef, useState } from 'react'
import { Button } from '@/components/ui/button'
import { downloadAll, downloadingLine, type PageFile } from './downloads'

/** *Download* in a file page's bar, its one main action: saves the page's `files`, from `urlOf`, and says so beside it.
 *  With `auto`, it saves them once as it shows. wiki/development/plain-pages.md#a-page-with-files */
export function DownloadButton({ files, urlOf, auto = false }: { files: PageFile[]; urlOf: (name: string) => string; auto?: boolean }) {
  // The app has no toasts: the line beside the button says what started.
  const [said, setSaid] = useState('')
  const start = useCallback(() => {
    setSaid(downloadingLine(files))
    downloadAll(files.map(file => urlOf(file.name)))
  }, [files, urlOf])
  const started = useRef(false)
  useEffect(() => {
    if (!auto || started.current) return
    started.current = true
    start()
  }, [auto, start])
  return <>
    {said && <span role="status" className="text-sm text-muted-foreground">{said}</span>}
    <Button type="button" onClick={start}><DownloadIcon data-icon="inline-start" />Download</Button>
  </>
}
