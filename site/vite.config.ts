import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

// Plain files: no Cloudflare plugin, because the site has no Worker code.
// wrangler.site.jsonc uploads what this builds into dist/.
export default defineConfig({
  plugins: [react()],
});
