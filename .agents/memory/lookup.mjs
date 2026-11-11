// WongStack's lookups for memory: the change a branch works on, a slug's state, the person's page, and what the
// `areas` command adds about paths: their moves, past changes, backlinks, and code users.
import { existsSync, readdirSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { longestArea, normalizePath, pathAreas } from '../skills/memory/scripts/lib/areas.mjs';
import { readHead } from '../skills/memory/scripts/lib/store.mjs';
import { codeUsers } from './lib/callers.mjs';
import { backlinks, readMoves } from './lib/links.mjs';

// The change whose proposal records the current branch.
export function currentSlug({ root, branch }) {
  const dir = join(root, 'openspec', 'changes');
  if (!branch || !existsSync(dir)) return null;
  for (const name of readdirSync(dir)) {
    const proposal = join(dir, name, 'proposal.md');
    if (name === 'archive' || !existsSync(proposal)) continue;
    if (readHead(proposal, 4096).match(/^\*\*Branch:\*\*\s*`?([^`\s]+)`?\s*$/m)?.[1] === branch) return name;
  }
  return null;
}

// Change state of every slug, from one read of the archive folder.
export function slugState({ root }) {
  const archive = join(root, 'openspec', 'changes', 'archive');
  const shipped = new Set(existsSync(archive) ? readdirSync(archive).map(name => name.replace(/^\d{4}-\d{2}-\d{2}-/, '')) : []);
  return slug => existsSync(join(root, 'openspec', 'changes', slug)) ? 'active' : shipped.has(slug) ? 'shipped' : 'conversation';
}

// The page under knowledge/people/, then wiki/people/, that lists the git email as a whole address, or null.
export function personPage(ctx) {
  const email = (ctx.author || '').toLowerCase();
  if (!email) return null;
  const pattern = new RegExp(`(^|[^\\w.+-])${email.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}($|[^\\w.-])`);
  for (const folder of ['knowledge/people', 'wiki/people']) {
    const dir = join(ctx.root, folder);
    if (!existsSync(dir)) continue;
    for (const name of readdirSync(dir).sort()) {
      if (!name.endsWith('.md') || name === 'README.md') continue;
      const text = readFileSync(join(dir, name), 'utf8');
      if (pattern.test(text.toLowerCase())) return { path: `${folder}/${name}`, text };
    }
  }
  return null;
}

// Every word inside a backticked span of a change's proposal, design, and tasks: the paths it names.
// The name may be an archived change's `archive/<folder>`.
export function changePaths({ root }, name) {
  const dir = join(root, 'openspec', 'changes', name);
  return ['proposal.md', 'design.md', 'tasks.md'].map(file => join(dir, file)).filter(existsSync)
    .flatMap(file => [...readFileSync(file, 'utf8').matchAll(/`([^`\n]+)`/g)])
    .flatMap(([, span]) => span.split(/[\s"'()]+/).filter(Boolean));
}

// An old path from a fact or an archive finds the page it names in the knowledge repo.
export function movedLines({ root }, paths) {
  const moved = readMoves(root)?.moves ?? {};
  return paths.map(path => normalizePath(path, root)).filter(path => moved[path]).map(path => `${path} moved to the knowledge repo: ${moved[path]}`);
}

const looksLikePath = word => word.includes('/') || /\.[a-z]+$/i.test(word);
const bare = (path, root) => normalizePath(path, root)?.replace(/\/+$/, '');

// Does an archived change name this path: the path itself, a path inside it, or a folder holding it at least as
// deep as its area's folder? A broad folder like `wiki/` or `.agents/skills/` names too much to count.
function namesPath(named, path, areas, root) {
  const longest = Math.max(longestArea(path, areas, root).longest, longestArea(`${path}/`, areas, root).longest);
  return named.some(word => word === path || word.startsWith(`${path}/`)
    || (path.startsWith(`${word}/`) && word.length + 1 >= longest && word.includes('/')));
}

// Up to `limit` archived changes, newest first: those naming one of the paths, then those sharing only an area.
// Read from the archive on each call, so nothing is kept up to date. `skip` is a change's own name.
export function pastChanges(root, paths, tags, areas, { skip, limit = 5 } = {}) {
  const archive = join(root, 'openspec', 'changes', 'archive');
  if (!existsSync(archive)) return [];
  const asked = [...new Set(paths.filter(looksLikePath).map(path => bare(path, root)).filter(Boolean))];
  const ranked = [[], []];
  for (const folder of readdirSync(archive).sort().reverse()) {
    if (folder.replace(/^\d{4}-\d{2}-\d{2}-/, '') === skip) continue;
    const named = [...new Set(changePaths({ root }, `archive/${folder}`).filter(looksLikePath).map(word => bare(word, root)).filter(Boolean))];
    if (asked.some(path => namesPath(named, path, areas, root))) ranked[0].push(folder);
    else if ([...pathAreas(named, areas, root).keys()].some(tag => tags.includes(tag))) ranked[1].push(folder);
  }
  return ranked.flat().slice(0, limit).map(folder => {
    const proposal = join(archive, folder, 'proposal.md');
    const title = existsSync(proposal) && readFileSync(proposal, 'utf8').match(/^# (.+)$/m)?.[1];
    return { folder, title: title || folder, proposal: `openspec/changes/archive/${folder}/proposal.md` };
  });
}

const capped = lines => [...lines.slice(0, 10), ...(lines.length > 10 ? [`+${lines.length - 10} more`] : [])].join('\n');
const useLine = ({ file, lines, names, via }) => {
  const note = [names.join(', '), via && `via ${via}`].filter(Boolean).join(', ');
  return `- ${file}:${lines.join(',')}${note ? ` (${note})` : ''}`;
};

// The `areas` command's extras after the docs: past changes, then each direct path's backlinks and code users.
export function lookupLines({ root }, { paths, named, tags, change, areas }) {
  const past = pastChanges(root, [...paths, ...named], tags, areas, { skip: change });
  const lines = past.length ? [`Past changes:\n${past.map(each => `- [${each.folder}](${each.proposal}) — ${each.title}`).join('\n')}`] : [];
  const scans = new Map();
  for (const path of paths) {
    const links = backlinks(root, path);
    if (links.length) lines.push(`Linked to ${path} from:\n${capped(links.map(link => `- ${link}`))}`);
    const users = codeUsers(root, path, scans).map(useLine);
    if (users.length) lines.push(`Code using ${path}:\n${capped(users)}`);
  }
  return lines;
}
