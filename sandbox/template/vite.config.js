import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

export default defineConfig({
  plugins: [react()],
  base: process.env.VITE_BASE || "/",
  server: {
    host: "0.0.0.0",
    port: 5173,
    strictPort: true,
    hmr: true,
    allowedHosts: true,
    watch: {
      usePolling: true,
      interval: 100
    }
  },
  watch:{
    usePolling: true,
    interval: 300,
    ignored: [
      "**/node_modules/**",
      "**/.git/**",
      "**/dist/**",
      "**/build/**",
      "**/sandbox/server/**",
      "**/sandbox/router/**",
      "**/ai/**"
    ]
  }
});
