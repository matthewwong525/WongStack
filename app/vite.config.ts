import { fileURLToPath } from 'node:url'
import { defineConfig, searchForWorkspaceRoot } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'

import { cloudflare } from "@cloudflare/vite-plugin";

const bootstrap = fileURLToPath(new URL('../scripts/employee-bootstrap.mjs', import.meta.url))

// https://vite.dev/config/
export default defineConfig(({ command }) => ({
  // Local dev runs the live line's Worker beside the app; a build leaves it out, and cf-build.sh bundles it.
  plugins: [react(), tailwindcss(), cloudflare(command === 'serve' ? { auxiliaryWorkers: [{ configPath: './wrangler.line.jsonc' }] } : {})],
  // `@/` is app/src/, the address the ready-made parts import each other by.
  resolve: { alias: { '@': fileURLToPath(new URL('./src', import.meta.url)) } },
  // The dev server reads one file outside app/: the setup script setup-file.ts imports, which a build bundles anyway.
  // Vite checks a `?raw` import's id as well as its path, so both are listed.
  ...(command === 'serve' && { server: { fs: { allow: [searchForWorkspaceRoot(process.cwd()), bootstrap, `${bootstrap}?raw`] } } }),
}))
