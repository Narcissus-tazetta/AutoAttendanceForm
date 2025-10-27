import browser from "webextension-polyfill";
import { closeTab } from "./tabManager";
import { storageGet, storageSet } from "../shared/storageHelper";

browser.runtime.onMessage.addListener(async (message: any, sender: any) => {
    if (message && message.action === "closeTab") {
        const tabId = sender && sender.tab && sender.tab.id ? sender.tab.id : message.tabId;
        console.debug("[AAF] background: closeTab request, tabId=", tabId);
        const ok = await closeTab(tabId);
        console.debug("[AAF] background: closeTab result=", ok);
        return { success: ok };
    }
    if (message && message.action === "saveUserName") {
        try {
            await storageSet({ userName: message.userName });
            console.debug("[AAF] background: saved userName");
            return { success: true };
        } catch (e) {
            console.debug("[AAF] background: saveUserName error", e);
            return { success: false };
        }
    }
    if (message && message.action === "getSavedSettings") {
        try {
            const res = await storageGet(["userName", "autoSubmit"]);
            console.debug("[AAF] background: getSavedSettings ->", res);
            return { userName: res.userName, autoSubmit: res.autoSubmit };
        } catch (e) {
            console.debug("[AAF] background: getSavedSettings error", e);
            return null;
        }
    }
    if (message && message.action === "saveAutoSubmit") {
        try {
            await storageSet({ autoSubmit: !!message.autoSubmit });
            console.debug("[AAF] background: saved autoSubmit=", !!message.autoSubmit);
            return { success: true };
        } catch (e) {
            console.debug("[AAF] background: saveAutoSubmit error", e);
            return { success: false };
        }
    }
});
