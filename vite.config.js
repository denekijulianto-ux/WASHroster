import { defineConfig } from "vite";
import { fileURLToPath } from "node:url";

// MOCK=1 swaps Supabase for an in-browser stand-in (UI tests only).
export default defineConfig(() => ({
  resolve: process.env.MOCK
    ? { alias: { "@supabase/supabase-js": fileURLToPath(new URL("./tools/test/mock-supabase.js", import.meta.url)) } }
    : {},
  define: process.env.MOCK
    ? { "import.meta.env.VITE_SUPABASE_URL": JSON.stringify("http://mock"), "import.meta.env.VITE_SUPABASE_ANON_KEY": JSON.stringify("mock") }
    : {},
  build: { chunkSizeWarningLimit: 900 },
}));
