const fse = require("fs-extra");
const path = require("path");
require("child_process");

const root = path.resolve(__dirname, "..");
const fontDir = path.join(root, "Playwrite_DE_SAS");
const outDir = path.join(root, "dist", "Playwrite_DE_SAS");

async function ensureOut() {
    await fse.ensureDir(outDir);
}

function convertTtfToWoff2(ttfPath, outPath) {
    try {
        let ttf2woff2 = require("ttf2woff2");
        if (ttf2woff2 && typeof ttf2woff2 !== "function" && typeof ttf2woff2.default === "function") {
            ttf2woff2 = ttf2woff2.default;
        }
        const buf = fse.readFileSync(ttfPath);
        const woff2 = ttf2woff2(buf);
        fse.writeFileSync(outPath, woff2);
        console.log(`Converted ${path.basename(ttfPath)} -> ${path.basename(outPath)}`);
        return true;
    } catch (e) {
        console.error("ttf2woff2 conversion failed:", e.message || e);
        return false;
    }
}

async function copyFonts() {
    if (!fse.existsSync(fontDir)) {
        console.warn("Font dir not found:", fontDir);
        return;
    }

    await ensureOut();

    const candidates = await fse.readdir(fontDir);
    for (const name of candidates) {
        const src = path.join(fontDir, name);
        const stat = await fse.stat(src);
        if (stat.isFile() && name.toLowerCase().endsWith(".ttf")) {
            const outName = name.replace(/\.ttf$/i, ".woff2");
            const outPath = path.join(outDir, outName);
            const ok = convertTtfToWoff2(src, outPath);
            if (!ok) {
                await fse.copy(src, path.join(outDir, name));
            }
        } else if (stat.isDirectory()) {
            await fse.copy(src, path.join(outDir, name));
        }
    }
}

copyFonts().catch((e) => {
    console.error("Error copying fonts:", e.message || e);
    process.exit(1);
});
