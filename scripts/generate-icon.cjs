const fs = require("fs");
const path = require("path");
const pngToIcoModule = require("png-to-ico");
const pngToIco = pngToIcoModule.default || pngToIcoModule;

async function run() {
  const projectRoot = path.resolve(__dirname, "..");
  const sourcePngPath = path.join(projectRoot, "public", "icon.png");
  const outputDir = path.join(projectRoot, "build");
  const outputIcoPath = path.join(outputDir, "icon.ico");

  if (!fs.existsSync(sourcePngPath)) {
    throw new Error(`Missing source icon: ${sourcePngPath}`);
  }

  fs.mkdirSync(outputDir, { recursive: true });
  const icoBuffer = await pngToIco(sourcePngPath);
  fs.writeFileSync(outputIcoPath, icoBuffer);
  console.log(`Generated ${outputIcoPath}`);
}

run().catch((error) => {
  console.error(error);
  process.exit(1);
});
