import { realpathSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { defineConfig, searchForWorkspaceRoot } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'

import { cloudflare } from "@cloudflare/vite-plugin";

const bootstrap = fileURLToPath(new URL('../scripts/employee-bootstrap.mjs', import.meta.url))
// The Access page: plain scripts in the access plugin, which the Access app mounts.
// Its real path: Vite follows the skill link, and an install keeps the folder there for real.
const accessScreen = realpathSync(fileURLToPath(new URL('../.agents/skills/access/screen', import.meta.url)))

// https://vite.dev/config/
export default defineConfig(({ command }) => ({
  // Local dev runs the live line's Worker beside the app; a build leaves it out, and cf-build.sh bundles it.
  plugins: [react(), tailwindcss(), cloudflare(command === 'serve' ? { auxiliaryWorkers: [{ configPath: './wrangler.line.jsonc' }] } : {})],
  // `@/` is app/src/, the address the ready-made parts import each other by.
  resolve: { alias: { '@': fileURLToPath(new URL('./src', import.meta.url)) } },
  // The dev server reads outside app/ the setup script setup-file.ts imports and the Access page; a build bundles both.
  // Vite checks a `?raw` import's id as well as its path, so both are listed.
  ...(command === 'serve' && { server: { fs: { allow: [searchForWorkspaceRoot(process.cwd()), bootstrap, `${bootstrap}?raw`, accessScreen] } } }),
}))
