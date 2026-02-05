const fse = require("fs-extra");
const path = require("path");

const root = path.resolve(__dirname, "..");

function inspectManifestDir(dirPath) {
    const manifestPath = path.join(dirPath, "manifest.json");
    if (!fse.existsSync(manifestPath)) return null;
    try {
        const raw = fse.readFileSync(manifestPath, "utf8");
        const manifest = JSON.parse(raw);
        return manifest;
    } catch {
        return null;
    }
}

function findBuildOutput(target) {
    const outputDir = path.join(root, ".output");
    if (!fse.existsSync(outputDir)) {
        throw new Error(".output directory not found");
    }

    const dirs = fse.readdirSync(outputDir).filter((d) => fse.lstatSync(path.join(outputDir, d)).isDirectory());
    if (dirs.length === 0) {
        throw new Error(".output directory is empty");
    }

    // Prefer explicit manifest inspection over name matching
    for (const d of dirs) {
        const full = path.join(outputDir, d);
        const manifest = inspectManifestDir(full);
        if (!manifest) continue;

        if (target === "firefox") {
            const isFirefoxLike =
                manifest.manifest_version === 2 ||
                (manifest.browser_specific_settings && manifest.browser_specific_settings.gecko);
            if (isFirefoxLike) return full;
        }

        if (target === "chrome") {
            const isChromeLike =
                manifest.manifest_version === 3 || (manifest.background && manifest.background.service_worker);
            if (isChromeLike) return full;
        }
    }

    // Fallback to name-based selection
    const isFirefox = target === "firefox";
    const primaryPrefix = isFirefox ? "firefox" : "chrome";
    const secondary = isFirefox ? /mv2/ : /mv3/;

    let found = dirs.find((d) => d.startsWith(primaryPrefix));
    if (!found) found = dirs.find((d) => secondary.test(d) && d.includes(primaryPrefix));

    if (!found) {
        throw new Error(`No build output found for ${target} in .output`);
    }

    return path.join(outputDir, found);
}

async function copyToDist(target) {
    const src = findBuildOutput(target);
    const dest = path.join(root, "dist", target);

    try {
        await fse.remove(dest);
        await fse.ensureDir(dest);
        await fse.copy(src, dest);

        // Ensure manifest_version is present (Chrome needs 3, Firefox needs 2)
        const destManifestPath = path.join(dest, "manifest.json");
        if (await fse.pathExists(destManifestPath)) {
            const raw = await fse.readFile(destManifestPath, "utf8");
            let manifest = JSON.parse(raw);

            // Ensure manifest_version exists
            if (manifest.manifest_version == null) {
                manifest.manifest_version = target === "chrome" ? 3 : 2;
                console.log(`Patched manifest_version=${manifest.manifest_version} into ${destManifestPath}`);
            }

            // Ensure icons are present (some builds may omit them)
            if (!manifest.icons) {
                manifest.icons = {
                    16: "icons/list-details.png",
                    32: "icons/list-details.png",
                    48: "icons/list-details.png",
                    128: "icons/list-details.png",
                };
                console.log(`Injected default icons into ${destManifestPath}`);
            }

            if (manifest.manifest_version >= 3) {
                if (manifest.background && manifest.background.scripts && manifest.background.scripts.length > 0) {
                    const svc = manifest.background.scripts[0];
                    manifest.background = { service_worker: svc };
                    console.log(
                        `Converted background.scripts -> background.service_worker (${svc}) in ${destManifestPath}`,
                    );
                }
                if (manifest.background && manifest.background.persistent !== undefined) {
                    delete manifest.background.persistent;
                }

                if (!manifest.action) {
                    manifest.action = { default_popup: "popup.html" };
                    console.log(`Added action.default_popup in ${destManifestPath}`);
                }
            } else {
                if (manifest.background && manifest.background.service_worker) {
                    const worker = manifest.background.service_worker;
                    manifest.background = { scripts: [worker], persistent: true };
                    console.log(
                        `Converted background.service_worker -> background.scripts (${worker}) in ${destManifestPath}`,
                    );
                }

                if (!manifest.browser_action) {
                    if (manifest.action) {
                        manifest.browser_action = manifest.action;
                        delete manifest.action;
                        console.log(`Converted action -> browser_action in ${destManifestPath}`);
                    } else {
                        manifest.browser_action = { default_popup: "popup.html" };
                        console.log(`Added browser_action.default_popup in ${destManifestPath}`);
                    }
                }
            }

            // Write back possibly-modified manifest
            await fse.writeFile(destManifestPath, JSON.stringify(manifest, null, 4), "utf8");
        }

        console.log(`Copied ${src} -> ${dest}`);

        // If target is firefox, produce dist/firefox.zip for distribution
        if (target === "firefox") {
            try {
                const { execSync } = require("child_process");
                const zipPath = path.join(root, "dist", "firefox.zip");
                // Remove existing zip if present
                if (await fse.pathExists(zipPath)) await fse.remove(zipPath);
                // Create zip from the contents of the dest directory
                // Use a subshell to ensure relative paths inside the zip
                execSync(`(cd "${dest}" && zip -r "${zipPath}" . -q)`);
                console.log(`Created zip archive: ${zipPath}`);
            } catch (err) {
                console.error("Failed to create firefox zip:", err.message || err);
                process.exit(1);
            }
        }
    } catch (e) {
        console.error("Failed to copy output:", e.message || e);
        process.exit(1);
    }
}

if (require.main === module) {
    const target = process.argv[2] || "chrome";
    copyToDist(target).catch((e) => {
        console.error(e);
        process.exit(1);
    });
}

module.exports = copyToDist;
