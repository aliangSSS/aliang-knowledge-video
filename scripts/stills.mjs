// Bundle once, render many stills. Called by tools/preview.py (which sets TMP to .cache/).
// usage: node tools/stills.mjs <outDir> <scale> <frame> [frame...]
import { bundle } from "@remotion/bundler";
import { openBrowser, renderStill, selectComposition } from "@remotion/renderer";
import path from "node:path";

const [outDir, scale, ...frames] = process.argv.slice(2);
const serveUrl = await bundle({ entryPoint: path.resolve("src/index.ts"), onProgress: () => undefined });
const browser = await openBrowser("chrome");
const composition = await selectComposition({ serveUrl, id: "Main", inputProps: {}, puppeteerInstance: browser });
for (const f of frames.map(Number)) {
  const output = path.join(outDir, `still_${String(f).padStart(5, "0")}.png`);
  await renderStill({ composition, serveUrl, frame: f, output, scale: Number(scale), puppeteerInstance: browser, overwrite: true });
  console.log(output);
}
await browser.close({ silent: true });
