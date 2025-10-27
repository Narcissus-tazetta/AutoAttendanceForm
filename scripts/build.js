const esbuild = require("esbuild");
const fse = require("fs-extra");
const path = require("path");

const root = path.resolve(__dirname, "..");
const src = path.join(root, "src");
const distRoot = path.join(root, "dist");
const buildDir = path.join(root, "build");

function mergeManifest(target) {
    // manifest.common.jsonをベースに、chrome/firefox用差分をマージ
    const common = fse.readJsonSync(path.join(root, "manifest.common.json"));
    const specificPath = path.join(root, `manifest.${target}.json`);
    let merged = { ...common };
    if (fse.existsSync(specificPath)) {
        const specific = fse.readJsonSync(specificPath);
        // 差分のみ上書き
        for (const key of Object.keys(specific)) {
            merged[key] = specific[key];
        }
    }
    // chrome用はapplications/browser_specific_settingsを除去
    if (target === "chrome") {
        delete merged.applications;
        delete merged.browser_specific_settings;
    }
    // firefox用はbackground.service_worker→background.scriptsに変換
    if (target === "firefox" && merged.background && merged.background.service_worker) {
        merged.background = { scripts: [merged.background.service_worker] };
        delete merged.background.service_worker;
    }
    // Firefox ビルド向けにパッチバージョンを+1（Firefoxはセマンティックバージョニングのみ許可）
    if (target === "firefox" && merged.version) {
        const versionParts = String(merged.version).split(".");
        if (versionParts.length === 3) {
            const patch = parseInt(versionParts[2], 10);
            versionParts[2] = String(patch + 1);
            merged.version = versionParts.join(".");
        }
    }
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
        minify: true,
        legalComments: "none",
        define: {
            "process.env.NODE_ENV": '"production"',
        },
    });
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
    } catch (e) {}

    await copyStaticFiles(target, outDir);

    // Ensure a copy of the built files is available under build/<target>/
    try {
        const buildTargetDir = path.join(buildDir, target);
        await fse.remove(buildTargetDir);
        await fse.copy(outDir, buildTargetDir);
        console.log(`Copied built files to ${buildTargetDir}`);
    } catch (e) {
        console.error("Failed to copy built files to build/:", e.message || e);
    }

    // Create a zip of the built files into build/<target>.zip
    try {
        const { spawnSync } = require("child_process");
        const zipPath = path.join(buildDir, `${target}.zip`);
        const zipRes = spawnSync("zip", ["-r", zipPath, "."], { cwd: outDir, stdio: "inherit" });
        if (zipRes.error) {
            console.error(`zip failed for ${target}:`, zipRes.error);
        } else {
            console.log(`Created zip: ${zipPath}`);
        }
    } catch (e) {
        console.error("Failed to create zip:", e.message || e);
    }

    if (target === "firefox") {
        try {
            const { spawnSync } = require("child_process");
            const res = spawnSync(
                "npx",
                ["web-ext", "build", "--source-dir=" + outDir, "--artifacts-dir=" + buildDir, "--overwrite-dest"],
                { stdio: "inherit" }
            );
            if (res.error) {
                console.error("web-ext build failed:", res.error);
            } else {
                console.log("✅ web-ext build completed successfully");
            }
        } catch (e) {
            console.error("Failed to run web-ext build:", e.message || e);
        }
    }

    if (target === "firefox") {
        try {
            const { spawnSync } = require("child_process");
            const zipPath = path.join(buildDir, "自動出席フォーム firefox.zip");
            const zipRes = spawnSync("zip", ["-r", zipPath, "."], { cwd: outDir, stdio: "inherit" });
            if (zipRes.error) {
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
