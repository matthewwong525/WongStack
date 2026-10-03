// Data-admin scope does not administer grants. Retired commands never use email.
import { StoreError } from './store.mjs';
const retired=()=>{throw new StoreError('memory membership and email removal are retired; a trusted installation operator must issue or revoke an exact machine grant',{kind:'forbidden'});};
export const MEMBER_COMMANDS={member:retired};
