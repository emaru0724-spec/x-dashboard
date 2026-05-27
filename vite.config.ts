import { cloudflare } from "@cloudflare/vite-plugin";
import react from "@vitejs/plugin-react";
import { defineConfig } from "vite";
import { resolve } from "path";

export default defineConfig({
  plugins: [react(), cloudflare()],
  resolve: { alias: { "@": resolve(__dirname, "src/client") } },
  server: { host: "0.0.0.0", port: 5182, allowedHosts: true },
});
