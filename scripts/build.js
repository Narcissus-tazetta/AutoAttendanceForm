const esbuild = require("esbuild");
const fse = require("fs-extra");
const path = require("path");

const root = path.resolve(__dirname, "..");
const src = path.join(root, "src");
const distRoot = path.join(root, "dist");
const buildDir = path.join(root, "build");

function mergeManifest(target) {
    const common = fse.readJsonSync(path.join(root, "manifest.common.json"));
    const specificPath = path.join(root, `manifest.${target}.json`);
    let specific = {};
    if (fse.existsSync(specificPath)) {
        specific = fse.readJsonSync(specificPath);
    }
    const merged = Object.assign({}, common, specific);
    return merged;
}

async function copyStaticFiles(target, outDir) {
    const staticFiles = [
        { src: "list-details.png", dest: "list-details.png" },
        { src: "Playwrite_DE_SAS", dest: "Playwrite_DE_SAS" },
    ];
    for (const file of staticFiles) {
        const srcPath = path.join(root, file.src);
        if (fse.existsSync(srcPath)) {
            await fse.copy(srcPath, path.join(outDir, file.dest));
        }
    }
    const popupHtml = `<!doctype html>
<html lang="ja">
    <head>
        <meta charset="utf-8" />
        <meta name="viewport" content="width=device-width,initial-scale=1" />
        <title>自動出席</title>
        <link rel="stylesheet" href="popup.css">
        <style>html,body{margin:0;padding:0}body{background:#e0f7fa;font-family:sans-serif}</style>
    </head>
    <body>
        <div id="root"></div>
        <script src="popup.js" defer></script>
    </body>
</html>`;
    await fse.writeFile(path.join(outDir, "popup.html"), popupHtml, "utf8");

    let manifest = mergeManifest(target);
    if (target === "chrome") {
        if (manifest.applications) delete manifest.applications;
        if (manifest.browser_specific_settings) delete manifest.browser_specific_settings;
    }
    await fse.writeJson(path.join(outDir, "manifest.json"), manifest, { spaces: 2 });
    const builtCss = path.join(root, "build", "popup.css");
    if (fse.existsSync(builtCss)) {
        await fse.copy(builtCss, path.join(outDir, "popup.css"));
    }
}

async function build(target = "chrome") {
    console.log(`Building for ${target}...`);

    const outDir = path.join(distRoot, target);
    await fse.remove(outDir);
    await fse.ensureDir(outDir);
    await fse.ensureDir(buildDir);

    const popupEntry = fse.existsSync(path.join(src, "popup.tsx"))
        ? path.join(src, "popup.tsx")
        : path.join(src, "popup.ts");

    const backgroundEntry =
        target === "firefox" && fse.existsSync(path.join(src, "firefox", "background.ts"))
            ? path.join(src, "firefox", "background.ts")
            : path.join(src, "background.ts");

    const entryPointsObj = {
        content: path.join(src, "content.ts"),
        background: backgroundEntry,
        popup: popupEntry,
    };

    await esbuild.build({
        entryPoints: entryPointsObj,
        entryNames: "[name]",
        bundle: true,
        format: "iife",
        platform: "browser",
        target: "es2020",
        loader: { ".ts": "ts", ".tsx": "tsx" },
        outdir: outDir,
        sourcemap: false,
        minify: false,
        legalComments: "none",
    });

    // If esbuild emitted the background into a nested folder (e.g. firefox/background.js),
    // move it to outDir/background.js so manifest paths match.
    try {
        const rel = path.relative(src, backgroundEntry);
        const subdir = path.dirname(rel);
        if (subdir && subdir !== ".") {
            const nestedBg = path.join(outDir, subdir, "background.js");
            const targetBg = path.join(outDir, "background.js");
            if (fse.existsSync(nestedBg) && !fse.existsSync(targetBg)) {
                await fse.copy(nestedBg, targetBg);
                await fse.remove(path.join(outDir, subdir));
            }
        }
    } catch (e) {
        // ignore
    }

    await copyStaticFiles(target, outDir);

    if (target === "firefox") {
        try {
            const { spawnSync } = require("child_process");
            const res = spawnSync(
                "npx",
                ["web-ext", "build", "--source-dir=" + outDir, "--artifacts-dir=" + buildDir],
                { stdio: "inherit" }
            );
            if (res.error) {
                console.error("web-ext build failed:", res.error);
            }
        } catch (e) {
            console.error("Failed to run web-ext build:", e.message || e);
        }
    }

    if (target === "firefox") {
        try {
            const { spawnSync } = require("child_process");
            // create a simple zip of the dist firefox folder for convenience
            const zipPath = path.join(buildDir, "firefox.zip");
            const zipRes = spawnSync("zip", ["-r", zipPath, "."], { cwd: outDir, stdio: "inherit" });
            if (zipRes.error) {
                // zip command may not be available on all systems; ignore silently
            }
        } catch (e) {}
    }

    console.log(`Build complete: ${outDir}`);
}

async function watch(target = "chrome") {
    console.log(`Starting watch mode for ${target}...`);

    const outDir = path.join(distRoot, target);
    await fse.remove(outDir);
    await fse.ensureDir(outDir);

    const popupEntry = fse.existsSync(path.join(src, "popup.tsx"))
        ? path.join(src, "popup.tsx")
        : path.join(src, "popup.ts");

    const backgroundEntry =
        target === "firefox" && fse.existsSync(path.join(src, "firefox", "background.ts"))
            ? path.join(src, "firefox", "background.ts")
            : path.join(src, "background.ts");

    const ctx = await esbuild.context({
        entryPoints: [path.join(src, "content.ts"), backgroundEntry, popupEntry],
        bundle: true,
        format: "iife",
        platform: "browser",
        target: "es2020",
        loader: { ".ts": "ts", ".tsx": "tsx" },
        outdir: outDir,
        sourcemap: true,
        minify: false,
        legalComments: "none",
    });
    await copyStaticFiles(target, outDir);
    await ctx.watch();
    console.log("Watching for changes...");
}

const args = process.argv.slice(2);
const isWatch = args.includes("watch");
const target = args.find((arg) => ["chrome", "firefox"].includes(arg)) || "chrome";

if (isWatch) {
    watch(target).catch((e) => {
        console.error("Watch failed:", e.message);
        process.exit(1);
    });
} else {
    build(target).catch((e) => {
        console.error("Build failed:", e.message);
        process.exit(1);
    });
}
