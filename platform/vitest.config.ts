import { defineConfig } from "vitest/config";
import path from "node:path";

export default defineConfig({
  test: {
    include: ["packages/**/*.test.ts", "apps/web/app/lib/**/*.test.ts"],
    environment: "node",
    globals: false,
  },
  resolve: {
    alias: {
      "@platform/corpus": path.resolve(__dirname, "packages/corpus/src/index.ts"),
      "@platform/safety": path.resolve(__dirname, "packages/safety/src/index.ts"),
      "@platform/compiler": path.resolve(__dirname, "packages/compiler/src/index.ts"),
      "@platform/ai": path.resolve(__dirname, "packages/ai/src/index.ts"),
      "@platform/eval": path.resolve(__dirname, "packages/eval/src/index.ts"),
      "@platform/diagnosis": path.resolve(__dirname, "packages/diagnosis/src/index.ts"),
      "@platform/ingest": path.resolve(__dirname, "packages/ingest/src/index.ts"),
      "@platform/missions": path.resolve(__dirname, "packages/missions/src/index.ts"),
      "@platform/storage": path.resolve(__dirname, "packages/storage/src/index.ts"),
      "@platform/auth": path.resolve(__dirname, "packages/auth/src/index.ts"),
      "@platform/gear": path.resolve(__dirname, "packages/gear/src/index.ts"),
    },
  },
});
