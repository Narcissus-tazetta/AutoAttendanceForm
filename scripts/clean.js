const fs = require("fs-extra");
const path = require("path");
const { glob } = require("glob");

const root = path.resolve(__dirname, "..");

async function cleanArtifacts() {
    console.log("🧹 Cleaning build artifacts...");

    // build 内の成果物削除
    const buildPaths = ["build/*.zip", "build/*.xpi", "build/popup.css", "build/signed/*"];

    for (const pattern of buildPaths) {
        try {
            const files = await glob(pattern, { cwd: root });
            for (const file of files) {
                await fs.remove(path.join(root, file));
                console.log(`  ✓ Removed: ${file}`);
            }
        } catch (e) {
            // ファイルが存在しない場合は無視
        }
    }

    // dist 内の全削除
    try {
        await fs.remove(path.join(root, "dist"));
        await fs.ensureDir(path.join(root, "dist"));
        console.log("  ✓ Cleared dist/");
    } catch (e) {
        console.log("  ! Could not clear dist/");
    }

    // .DS_Store などの隠しファイル削除
    try {
        const dsStoreFiles = await glob("**/.DS_Store", {
            cwd: root,
            ignore: ["node_modules/**", ".git/**"],
        });
        for (const file of dsStoreFiles) {
            await fs.remove(path.join(root, file));
            console.log(`  ✓ Removed: ${file}`);
        }
    } catch (e) {
        // 隠しファイルがない場合は無視
    }

    console.log("✅ Clean completed!");
}

if (require.main === module) {
    cleanArtifacts().catch(console.error);
}

module.exports = cleanArtifacts;
