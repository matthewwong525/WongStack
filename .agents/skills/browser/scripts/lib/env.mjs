// The browser module's copy of memory's `.env` reader (memory/scripts/lib/store.mjs), kept equal by a test.
// A quoted value keeps everything inside its quotes; a comment is cut only after it or from an unquoted value.
export function parseEnv(text) {
  const env = {};
  for (const line of text.split(/\r?\n/)) {
    const match = line.match(/^\s*(?:export\s+)?([A-Za-z_][A-Za-z0-9_]*)\s*=(.*)$/);
    if (!match) continue;
    const value = match[2].trim();
    const quoted = value.match(/^(['"])(.*)\1(?:\s+#.*)?$/);
    env[match[1]] = quoted ? quoted[2] : value.replace(/\s+#.*$/, '');
  }
  return env;
}
