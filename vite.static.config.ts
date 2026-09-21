import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";
import { fileURLToPath } from "node:url";

export default defineConfig(({ isSsrBuild }) => ({
  plugins: [react(), tailwindcss()],
  resolve: {
    alias: {
      "next/link": fileURLToPath(
        new URL("./static/navigation.tsx", import.meta.url),
      ),
      "next/navigation": fileURLToPath(
        new URL("./static/navigation.tsx", import.meta.url),
      ),
    },
  },
  define: { "process.env.NEXT_PUBLIC_STATIC_SITE": JSON.stringify("true") },
  publicDir: false,
  build: {
    outDir: isSsrBuild ? "dist/static-render" : "dist/static",
    emptyOutDir: true,
    manifest: !isSsrBuild,
    rollupOptions: {
      input: isSsrBuild ? "static/render.tsx" : "static/client.tsx",
    },
  },
}));
