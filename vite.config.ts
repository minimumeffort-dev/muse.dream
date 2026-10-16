import { defineConfig } from "vite";
import {mediaCapturePlugin} from "./scripts/media-middleware";

export default defineConfig({
  plugins: [mediaCapturePlugin()],
  build: {rollupOptions:{input:{game:'index.html',lab:'lab/index.html'}}},
  server: { host: "127.0.0.1", port: 5173, watch: { ignored: ["**/dist-docs/**"] } },
  preview: { host: "127.0.0.1", port: 4173 },
  test: { environment: "node", include: ["tests/**/*.test.ts"], setupFiles:["tests/setup.ts"] },
});
