import { defineContentScript } from "wxt/utils/define-content-script";

export default defineContentScript({
    matches: ["https://docs.google.com/forms/*"],
    async main() {
        const m = await import("../../src/content");
        if (m && typeof m.initContentScript === "function") {
            m.initContentScript();
        }
    },
});
