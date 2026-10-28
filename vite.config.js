import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

// SITE_URL (for example https://your-domain.com) is used for canonical links, the sitemap and robots.txt.
const siteUrl = (process.env.SITE_URL || "").replace(/\/$/, "");

export default defineConfig({
  plugins: [react()],
  define: { "import.meta.env.VITE_SITE_URL": JSON.stringify(siteUrl) },
  server: {
    // `npm run dev` for the site and `npm run server` for the API, side by side.
    proxy: { "/api": "http://localhost:4000" },
  },
});
