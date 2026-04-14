import { build } from "esbuild";
import { readFile, writeFile } from "node:fs/promises";
import { resolve } from "node:path";

const repoRoot = resolve(new URL("..", import.meta.url).pathname);
const input = process.argv[2]
  ? resolve(process.argv[2])
  : resolve(repoRoot, "tests/js/ffish.js");
const output = process.argv[3]
  ? resolve(process.argv[3])
  : resolve(repoRoot, "tests/js/ffish.fairyground.js");

await build({
  entryPoints: [input],
  outfile: output,
  bundle: false,
  format: "esm",
  platform: "browser",
  target: "es2018",
  define: {
    "globalThis.process": "undefined",
    module: "undefined",
    __filename: "undefined",
    __dirname: '""',
  },
  logLevel: "info",
});

let text = await readFile(output, "utf8");

// Fairyground's Browserify pipeline walks bare `require()` calls even in
// dead Node-only branches. Replace them with inert placeholders after the
// browser-targeted transform.
text = text
  .replaceAll('var fs = require("node:fs");', "var fs = null;")
  .replaceAll(
    'var nodeCrypto = require("node:crypto");',
    "var nodeCrypto = null;",
  );

await writeFile(output, text);

console.log(`Wrote Fairyground-compatible ffish bundle to ${output}`);
