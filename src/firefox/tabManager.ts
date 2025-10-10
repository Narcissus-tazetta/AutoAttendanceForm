import browser from "webextension-polyfill";

export async function closeTab(tabId?: number): Promise<boolean> {
    try {
        if (typeof tabId === "number") {
            console.debug("[AAF] tabManager.closeTab: removing tab", tabId);
            await browser.tabs.remove(tabId);
            return true;
        }
        return false;
    } catch (e) {
        try {
            const tabs = await browser.tabs.query({ active: true, currentWindow: true });
            if (tabs && tabs.length) {
                console.debug("[AAF] tabManager.closeTab: fallback removing active tab", tabs[0].id);
                await browser.tabs.remove(tabs[0].id as number);
                return true;
            }
        } catch (err) {
            console.debug("[AAF] tabManager.closeTab: fallback error", err);
        }
        return false;
    }
}
