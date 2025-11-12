/// <reference types="vitest" />
import react from "@vitejs/plugin-react";
import { defineConfig } from "vite";
export default defineConfig({
    plugins: [react()],
    build: {
        sourcemap: true,
    },
    test: {
        globals: true,
        environment: "jsdom",
        setupFiles: "./vitest.setup.ts",
    },
});
