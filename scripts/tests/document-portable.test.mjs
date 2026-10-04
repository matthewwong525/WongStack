// Portable fallback is tested without native QMD, sqlite, a private store or a model download.
import test from 'node:test';
import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import { existsSync, mkdirSync, mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';

test('portable keyword and unavailable semantic modes return original evidence without installing', t => {
  const cwd = mkdtempSync(join(tmpdir(), 'wong-portable-documents-'));
  t.after(() => rmSync(cwd, { recursive: true, force: true }));
  execFileSync('git', ['init', '-q'], { cwd }); mkdirSync(join(cwd, 'wiki'));
  writeFileSync(join(cwd, 'wiki/guide.md'), '# Portable guidance\nPortable keyword retrieval reads originals.\n');
  const data = join(cwd, 'data'), cli = fileURLToPath(new URL('../../.agents/skills/memory/scripts/memory.mjs', import.meta.url));
  const env = { ...process.env, LOCALAPPDATA: data, XDG_DATA_HOME: data, CLOUDFLARE_MEMORY_TOKEN: '' };
  for (const mode of ['keyword', 'semantic']) {
    const text = execFileSync(process.execPath, [cli, 'documents', 'portable keyword retrieval', '--mode', mode, '--json'], { cwd, env, encoding: 'utf8' });
    const packet = JSON.parse(text);
    assert.ok(Buffer.byteLength(text) <= 6144); assert.equal(packet.backend, 'lexical-fallback');
    assert.equal(packet.documents[0].path, 'wiki/guide.md'); assert.equal(packet.documents[0].freshness, 'verified');
    assert.equal(packet.requestedModeState, mode === 'semantic' ? 'unavailable' : 'ok');
  }
  assert.equal(existsSync(join(data, 'wongstack/documents/runtime-2.8.3')), false);
});
