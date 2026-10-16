import { defineConfig } from "vite";
import {mediaCapturePlugin} from "./scripts/media-middleware";

export default defineConfig({
  plugins: [mediaCapturePlugin()],
  server: { host: "127.0.0.1", port: 5173 },
  preview: { host: "127.0.0.1", port: 4173 },
  test: { environment: "node", include: ["tests/**/*.test.ts"] },
});
