import { reactRouter } from "@react-router/dev/vite";
import tailwindcss from "@tailwindcss/vite";
import { defineConfig } from "vite";
import tsconfigPaths from "vite-tsconfig-paths";

export default defineConfig({
  plugins: [tailwindcss(), reactRouter(), tsconfigPaths()],
  server: { //Custom dev server configuration
    host: "0.0.0.0",
    port: 5173,
    middlewareMode: false
  } //Custom dev server configuration
});
