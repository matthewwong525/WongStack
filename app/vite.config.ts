import { fileURLToPath } from 'node:url'
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'

import { cloudflare } from "@cloudflare/vite-plugin";

// https://vite.dev/config/
export default defineConfig(({ command }) => ({
  // Local dev runs the live line's Worker beside the app; a build leaves it out, and cf-build.sh bundles it.
  plugins: [react(), tailwindcss(), cloudflare(command === 'serve' ? { auxiliaryWorkers: [{ configPath: './wrangler.line.jsonc' }] } : {})],
  // `@/` is app/src/, the address the ready-made parts import each other by.
  resolve: { alias: { '@': fileURLToPath(new URL('./src', import.meta.url)) } },
}))
