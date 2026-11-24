import { createRequire } from "node:module";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { rm } from "node:fs/promises";

const require = createRequire(import.meta.url);
const artifactDir = path.dirname(fileURLToPath(import.meta.url));
const rootDir = path.resolve(artifactDir, "../..");
const esbuildPath = path.resolve(rootDir, "node_modules/.pnpm/esbuild@0.27.3/node_modules/esbuild");
const esbuild = require(esbuildPath);

async function buildAll() {
  const distDir = path.resolve(artifactDir, "dist");
  await rm(distDir, { recursive: true, force: true });

  const bannerText = `import { createRequire as __bannerCrReq } from 'node:module';
import __bannerPath from 'node:path';
import __bannerUrl from 'node:url';

globalThis.require = __bannerCrReq(import.meta.url);
globalThis.__filename = __bannerUrl.fileURLToPath(import.meta.url);
globalThis.__dirname = __bannerPath.dirname(globalThis.__filename);
`;

  await esbuild.build({
    entryPoints: [path.resolve(artifactDir, "src/index.ts")],
    platform: "node",
    bundle: true,
    format: "esm",
    outdir: distDir,
    outExtension: { ".js": ".mjs" },
    logLevel: "info",
    sourcemap: "linked",
    banner: { js: bannerText },
    external: [
      "bcrypt",
      "pino",
      "pino-http",
      "pino-pretty"
    ]
  });
}

buildAll().catch((err) => {
  console.error(err);
  process.exit(1);
});
