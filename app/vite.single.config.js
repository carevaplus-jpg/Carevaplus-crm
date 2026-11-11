import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import { viteSingleFile } from "vite-plugin-singlefile";

// One self-contained HTML file (JS, CSS and logo inlined) — open it directly in any browser.
export default defineConfig({
  root: __dirname,
  publicDir: false,
  plugins: [react(), viteSingleFile({ removeViteModuleLoader: true })],
  build: { outDir: "dist-html", emptyOutDir: true, assetsInlineLimit: 100_000_000, cssCodeSplit: false },
});
