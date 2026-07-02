import { config } from "dotenv";
import { defineConfig } from "vitest/config";

// Tests read the same env as the app (Supabase URL + keys). Never committed.
config({ path: ".env.local", quiet: true });

export default defineConfig({
  test: {
    environment: "node",
    include: ["tests/**/*.test.ts"],
    // RLS isolation test talks to the real Supabase project over the network.
    testTimeout: 30_000,
    hookTimeout: 30_000,
  },
});
