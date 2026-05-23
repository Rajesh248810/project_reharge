const { bundle } = require('@remotion/bundler');
const { renderMedia, selectComposition } = require('@remotion/renderer');
const path = require('path');
const fs = require('fs');

async function main() {
  // Parse command line arguments
  // Example usage: node render.js --composition=DueReminderVideo --name="Manoj" --price=250 --date="2026-05-31" --lang="OD" --out="out.mp4"
  const args = {};
  process.argv.slice(2).forEach(arg => {
    if (arg.startsWith('--')) {
      const [key, value] = arg.split('=');
      args[key.slice(2)] = value;
    }
  });

  const compositionId = args.composition || 'DueReminderVideo';
  const name = args.name || 'Manoj Kumar Sahoo';
  const price = parseFloat(args.price || '250');
  const date = args.date || '2026-05-31';
  const lang = args.lang || 'OD';
  const outPath = args.out || path.join(__dirname, 'out.mp4');

  console.log(`[REMOTION] Starting video render request...`);
  console.log(` - Composition: ${compositionId}`);
  console.log(` - Name: ${name}`);
  console.log(` - Price: Rs. ${price}`);
  console.log(` - Date: ${date}`);
  console.log(` - Language: ${lang}`);
  console.log(` - Output Destination: ${outPath}`);

  // Create destination folder if not exists
  const outFolder = path.dirname(outPath);
  if (!fs.existsSync(outFolder)) {
    fs.mkdirSync(outFolder, { recursive: true });
  }

  // 1. Bundle the React Remotion project
  const entryPoint = path.join(__dirname, 'src', 'index.ts');
  console.log(`[REMOTION] Bundling project entrypoint: ${entryPoint}`);
  const bundleLocation = await bundle({
    entryPoint,
    // Enable caching for superfast repeat compiles
    enableCaching: true,
  });

  // 2. Select Composition
  console.log(`[REMOTION] Selecting composition ID: ${compositionId}`);
  const inputProps = { name, price, date, lang };
  const composition = await selectComposition({
    serveUrl: bundleLocation,
    id: compositionId,
    inputProps,
  });

  // 3. Render MP4 Video Media
  console.log(`[REMOTION] Rendering frames... (this might take a few seconds)`);
  await renderMedia({
    composition,
    serveUrl: bundleLocation,
    codec: 'h264',
    outputLocation: outPath,
    inputProps,
  });

  console.log(`[REMOTION] Rendering Successful! Saved to: ${outPath}`);
}

main().catch(err => {
  console.error('[REMOTION] Render Failed with Error:', err);
  process.exit(1);
});
