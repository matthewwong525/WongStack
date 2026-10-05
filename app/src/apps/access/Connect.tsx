import { Button } from '@/components/ui/button'
import { ConnectDialog } from '../../components/ConnectDialog'

// For whoever manages Access: a button beside the heading that opens the steps in a popup over the page.
export function Connect() {
  return <ConnectDialog><Button type="button" variant="outline">Connect your assistant</Button></ConnectDialog>
}
