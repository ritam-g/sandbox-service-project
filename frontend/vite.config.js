import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import tailwindcss from '@tailwindcss/vite';

export default defineConfig({
    plugins: [react(), tailwindcss()],
    base: "./",
    server: {
        host: "0.0.0.0",
        port: 5173,
        watch: {
            usePolling: true
        },
        hmr: {
            clientPort: 443
        },
        allowedHosts: true
    }
});