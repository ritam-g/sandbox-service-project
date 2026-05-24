import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

export default defineConfig({
    plugins: [react()],

    base: "/",

    server: {
        host: "0.0.0.0",
        port: 5173,
        strictPort: true,

        watch: {
            usePolling: true
        },

        hmr: {
            protocol: "wss",
            host: "supreme-potato-pj4v4xgpxwpvc6p4-3000.app.github.dev",
            clientPort: 443
        }
    }
});