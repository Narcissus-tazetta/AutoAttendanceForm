import { defineConfig } from "wxt";
import common from "./manifest.common.json";

function mergeManifests(base: any, override: any) {
    const out = JSON.parse(JSON.stringify(base));
    for (const k of Object.keys(override || {})) {
        const v = override[k];
        if (Array.isArray(v)) {
            out[k] = Array.from(new Set([...(out[k] || []), ...v]));
        } else if (typeof v === "object" && v !== null) {
            out[k] = Object.assign({}, out[k] || {}, v);
        } else {
            out[k] = v;
        }
    }
    return out;
}

export default defineConfig({
    manifestVersion: ({ browser }) => (browser === "firefox" ? 2 : 3),

    vite: () => {
        return {
            build: {
                modulePreload: false,
                minify: "esbuild",
                sourcemap: false,
                rollupOptions: {
                    output: {
                        assetFileNames: "assets/[name].[ext]",
                        chunkFileNames: "chunks/[name].js",
                        entryFileNames: "[name].js",
                    },
                },
            },
            cacheDir: ".vite-cache",
            define: {
                __DEV__: false,
            },
        };
    },

    manifest: ({ browser }) => {
        if (browser === "firefox") {
            return mergeManifests(common, {
                background: { scripts: ["background.js"], persistent: true },
                permissions: ["storage", "tabs", "https://docs.google.com/forms/*"],
                browser_action: { default_popup: "popup.html" },
                browser_specific_settings: {
                    gecko: { id: "auto-attendance-form@narcissus-tazetta.github.io" },
                },
                version: common.version,
            });
        }
        return mergeManifests(common, {
            background: { service_worker: "background.js" },
            permissions: ["activeTab", "scripting", "storage", "tabs"],
            host_permissions: ["https://docs.google.com/forms/*"],
            action: { default_popup: "popup.html" },
            version: common.version,
        });
    },
});
