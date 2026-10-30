import { readFileSync } from "node:fs";
import {fileURLToPath} from 'node:url';
import { cloudflare } from "@cloudflare/vite-plugin";
import { tanstackStart } from "@tanstack/react-start/plugin/vite";
import react from "@vitejs/plugin-react";
import { defineConfig } from "vite";

// Every runtime dependency is bundled at startup, for the browser and the SSR worker: one first imported
// mid-session makes Vite re-bundle, and a page rendered meanwhile on the server loads a second React.
// Not listed: React itself, the TanStack Start/Router framework (its plugin bundles it) and build-time plugins.
const NOT_PREBUNDLED = new Set(["react", "react-dom", "@tanstack/react-start", "@tanstack/react-router", "@tanstack/react-router-ssr-query", "tailwindcss-animate"]);
const { dependencies } = JSON.parse(readFileSync(new URL("./package.json", import.meta.url), "utf8"));
const PREBUNDLE = Object.keys(dependencies).filter((name) => !NOT_PREBUNDLED.has(name));

export default defineConfig({
  resolve:{alias:{'@':fileURLToPath(new URL('./src',import.meta.url))}},
  server: {
    fs: {
      // Preserve Vite's defaults and keep account storage out of static serving.
      deny: [".env", ".env.*", "**/.dev.vars*", "*.{crt,pem}", "**/.git/**", "**/.wrangler/**", "**/.local-accounts.json", "**/.local-account-*.sql", "**/Track 1 - Agricultural Productivity/**", "**/data/private/**", "**/*.dta", "**/*.sav"],
    },
  },
  optimizeDeps: { include: PREBUNDLE },
  environments: {
    ssr: {
      optimizeDeps: { include: PREBUNDLE },
      // Private Worker source maps diagnose server errors; browser bundles omit maps.
      build: { sourcemap: true, rolldownOptions: { output: { sourcemapExcludeSources: true } } },
    },
  },
  plugins: [
    // No inspector: a restarted dev server would race the old one for port 9229 and crash.
    cloudflare({ viteEnvironment: { name: "ssr" }, inspectorPort: false }),
    tanstackStart({ srcDirectory: "src" }),
    react(),
  ],
});
