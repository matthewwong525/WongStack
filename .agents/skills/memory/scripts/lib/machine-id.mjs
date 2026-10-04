// One private installation identity per OS user. Publish a complete file exclusively:
// simultaneous first starts either win the hard link or read the winner's complete ID.
import { randomUUID } from 'node:crypto';
import { chmodSync, linkSync, mkdirSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { homedir } from 'node:os';
import { join } from 'node:path';

export const MACHINE_ID = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/;
export function machineIdFile(environment = process.env) {
  const userHome = environment.HOME || environment.USERPROFILE || homedir();
  const data = process.platform === 'win32' ? environment.LOCALAPPDATA || join(userHome, 'AppData', 'Local')
    : environment.XDG_DATA_HOME || join(userHome, '.local', 'share');
  return join(data, 'wongstack', 'machine-id');
}
export function machineId(file = machineIdFile()) {
  const read = () => {
    const id = readFileSync(file, 'utf8').trim();
    if (!MACHINE_ID.test(id)) throw new Error(`Invalid WongStack machine identity at ${file}; restore the original file or ask the admin. Ownership was not changed.`);
    chmodSync(file, 0o600);
    return id;
  };
  try { return read(); } catch (error) { if (error.code !== 'ENOENT') throw error; }
  mkdirSync(join(file, '..'), { recursive: true, mode: 0o700 });
  const temporary = `${file}.${process.pid}.${randomUUID()}.tmp`;
  try {
    writeFileSync(temporary, `${randomUUID()}\n`, { flag: 'wx', mode: 0o600 });
    try { linkSync(temporary, file); } catch (error) { if (error.code !== 'EEXIST') throw error; }
    return read();
  } finally { rmSync(temporary, { force: true }); }
}
