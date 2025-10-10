import browser from "webextension-polyfill";

browser.runtime.onMessage.addListener((message: any, sender: any) => {
    if (message.action === "closeTab" && sender && sender.tab) {
        setTimeout(() => {
            browser.tabs.remove(sender.tab.id);
        }, 1000);
    }
});
