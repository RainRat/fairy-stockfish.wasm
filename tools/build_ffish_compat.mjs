import { transform } from "esbuild";
import { readFile, writeFile } from "node:fs/promises";
import { resolve } from "node:path";

const repoRoot = resolve(new URL("..", import.meta.url).pathname);
const input = process.argv[2]
  ? resolve(process.argv[2])
  : resolve(repoRoot, "tests/js/ffish.js");
const output = process.argv[3]
  ? resolve(process.argv[3])
  : resolve(repoRoot, "tests/js/ffish.fairyground.js");

let text = await readFile(input, "utf8");

text = text
  .replace(
    'var Module=typeof Module!="undefined"?Module:{};',
    [
      "Module = Module || {};",
      "var readyPromiseResolve,readyPromiseReject;",
      'Module["ready"]=new Promise(function(resolve,reject){readyPromiseResolve=resolve;readyPromiseReject=reject});',
    ].join(""),
  )
  .replace(
    'var ENVIRONMENT_IS_NODE=globalThis.process?.versions?.node&&globalThis.process?.type!="renderer";',
    "var ENVIRONMENT_IS_NODE=false;",
  )
  .replaceAll('var fs=require("node:fs");', "var fs=null;")
  .replaceAll('var nodeCrypto=require("node:crypto");', "var nodeCrypto=null;")
  .replace(
    'initRuntime();Module["onRuntimeInitialized"]?.();postRun()',
    'initRuntime();readyPromiseResolve(Module);Module["onRuntimeInitialized"]?.();postRun()',
  );

const wrapped = [
  "var ModuleFactory = function(Module) {",
  text,
  'return Module["ready"];',
  "};",
  "export default ModuleFactory;",
  "",
].join("\n");

const transformed = await transform(wrapped, {
  format: "esm",
  platform: "browser",
  target: "es2015",
  loader: "js",
  logLevel: "silent",
});

await writeFile(output, transformed.code);

console.log(`Wrote Fairyground-compatible ffish bundle to ${output}`);
