import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";
import { defineConfig } from "vite";

export default defineConfig({
  plugins: [react(), tailwindcss()],
  server: { //Custom dev server configuration
    host: "0.0.0.0",
    port: 5173,
    middlewareMode: false
  } //Custom dev server configuration
});
