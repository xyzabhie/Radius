import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import { nodePolyfills } from "vite-plugin-node-polyfills";

const host = process.env.TAURI_DEV_HOST;

// https://vite.dev/config/
export default defineConfig(async () => ({
  plugins: [
    react(),
    nodePolyfills({
      include: ['path', 'stream', 'util', 'events', 'http', 'https', 'buffer', 'process'],
      globals: {
        Buffer: true,
        global: true,
        process: true,
      },
    }),
  ],

  // Vite options tailored for Tauri development and only applied in `tauri dev` or `tauri build`
  //
  // 1. prevent Vite from obscuring rust errors
  clearScreen: false,
  // 2. tauri expects a fixed port, fail if that port is not available
  server: {
    port: 1420,
    strictPort: true,
    host: host || false,
    hmr: host
      ? {
        protocol: "ws",
        host,
        port: 1421,
      }
      : undefined,
    watch: {
      // 3. tell Vite to ignore watching `src-tauri`
      ignored: ["**/src-tauri/**"],
    },
  },
  resolve: {
    alias: {
      "node:util/types": "c:\\Users\\DeLL\\Documents\\codewode\\Radius\\packages\\gui\\src\\lib\\shims\\util-types.ts",
      "util/types": "c:\\Users\\DeLL\\Documents\\codewode\\Radius\\packages\\gui\\src\\lib\\shims\\util-types.ts",
      "diagnostics_channel": "c:\\Users\\DeLL\\Documents\\codewode\\Radius\\packages\\gui\\src\\lib\\shims\\diagnostics-channel.ts",
      "node:diagnostics_channel": "c:\\Users\\DeLL\\Documents\\codewode\\Radius\\packages\\gui\\src\\lib\\shims\\diagnostics-channel.ts",
      "http2": "c:\\Users\\DeLL\\Documents\\codewode\\Radius\\packages\\gui\\src\\lib\\shims\\http2.ts",
      "node:http2": "c:\\Users\\DeLL\\Documents\\codewode\\Radius\\packages\\gui\\src\\lib\\shims\\http2.ts",
    },
  },
}));
