// Where this workspace's company knowledge is: the real folder `knowledge/` names, or null on an install with none.
// wiki/stack/company-knowledge.md
import { existsSync, realpathSync, statSync } from 'node:fs';
import { join } from 'node:path';

export function knowledgeCopy(root) {
  try {
    const copy = realpathSync(join(root, 'knowledge'));
    return statSync(copy).isDirectory() && existsSync(join(copy, '.git')) ? copy : null;
  } catch { return null; }
}
