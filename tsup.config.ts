import { defineConfig } from "tsup";

export default defineConfig({
  entry: ["src/index.ts", "src/index.browser.ts"],
  format: ["cjs", "esm"],
  dts: true,
  outDir: "dist",
  clean: true,
  platform: "neutral",
});
