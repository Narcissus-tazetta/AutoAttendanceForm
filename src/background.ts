import { defineBackground } from "wxt/utils/define-background";
import { browser } from "wxt/browser";

export default defineBackground(() => {
    const armedTabs = new Map<number, number>();
    const ARM_TTL_MS = 2 * 60 * 1000;

    const isArmed = (tabId: number): boolean => {
        const ts = armedTabs.get(tabId);
        if (!ts) return false;
        if (Date.now() - ts > ARM_TTL_MS) {
            armedTabs.delete(tabId);
            return false;
        }
        return true;
    };
    const shouldCloseByUrl = (url?: string): boolean => {
        if (!url) return false;
        if (url.indexOf("docs.google.com/forms") === -1) return false;
        return url.indexOf("formResponse") !== -1;
    };

    const closeByUrl = (tabId: number, url?: string) => {
        if (!shouldCloseByUrl(url)) return;
        if (!isArmed(tabId)) return;
        setTimeout(() => {
            try {
                void browser.tabs.remove(tabId).catch(() => {
                    /* ignore */
                });
            } catch {
                /* ignore */
            }
        }, 100);
    };

    browser.tabs.onUpdated.addListener((tabId, changeInfo, tab) => {
        const url = changeInfo.url || (tab && (tab as any).url);
        if (!url) return;
        closeByUrl(tabId, url);
    });

    browser.tabs.onRemoved.addListener((tabId) => {
        armedTabs.delete(tabId);
    });

    browser.runtime.onMessage.addListener((message: any, sender: any, sendResponse: any) => {
        if (!message || !message.action) return;

        if (message.action === "close_window") message.action = "close_tab";

        if (message.action === "identifyTab") {
            console.log(
                "background: identifyTab request, message:",
                message,
                "sender:",
                sender && sender.tab && sender.tab.id,
            );
            (async () => {
                const senderTabId = sender && sender.tab && sender.tab.id ? sender.tab.id : undefined;
                if (senderTabId) {
                    console.log("background: identifyTab using senderTabId:", senderTabId);
                    sendResponse({ tabId: senderTabId });
                    return;
                }

                if (message && message.url) {
                    try {
                        const tabs = await browser.tabs.query({});
                        const target = message.url.split("#")[0].split("?")[0];
                        for (const t of tabs) {
                            if (t && (t as any).id && t.url) {
                                const tUrl = (t as any).url.split("#")[0].split("?")[0];
                                if (
                                    tUrl === target ||
                                    tUrl.startsWith(target) ||
                                    t.url.indexOf("docs.google.com/forms") !== -1
                                ) {
                                    console.log("background: identifyTab matched tab:", (t as any).id, t.url);
                                    sendResponse({ tabId: (t as any).id });
                                    return;
                                }
                            }
                        }

                        try {
                            const activeTabs = await browser.tabs.query({ active: true, currentWindow: true });
                            if (activeTabs && activeTabs.length) {
                                const at = activeTabs[0] as any;
                                if (
                                    at &&
                                    at.id &&
                                    at.url &&
                                    (at.url.indexOf("docs.google.com/forms") !== -1 || at.url.startsWith(target))
                                ) {
                                    console.log("background: identifyTab matched active tab:", at.id, at.url);
                                    sendResponse({ tabId: at.id });
                                    return;
                                }
                            }
                        } catch (e) {
                            console.error("background: active tab fallback failed:", e);
                        }
                    } catch (_err) {
                        console.error("background: identifyTab query failed:", _err);
                    }
                }

                console.log("background: identifyTab no match");
                sendResponse({ tabId: undefined });
            })();
            return true;
        }

        if (message.action === "close_tab") {
            console.log("background: close_tab request", { message, senderTab: sender && sender.tab && sender.tab.id });
            (async () => {
                const requestedTabId = message && message.tabId ? message.tabId : undefined;
                const senderTabId = sender && sender.tab && sender.tab.id ? sender.tab.id : undefined;
                const senderUrl = sender && sender.tab && sender.tab.url ? sender.tab.url : undefined;
                const messageUrl = message && message.url ? message.url : undefined;

                if (!requestedTabId && !senderTabId && !messageUrl) {
                    await browser.storage.local.set({
                        lastClose: { success: false, tabId: requestedTabId, error: "no tabId", ts: Date.now() },
                    });
                    sendResponse({ success: false, reason: "no tabId" });
                    return;
                }

                const attempts: Array<any> = [];
                const recordAttempt = async (id: any, err: any) => {
                    const entry = { tabId: id, error: err ? String(err) : undefined, ts: Date.now() };
                    attempts.push(entry);
                    await browser.storage.local.set({ lastCloseAttempt: { attempts, ts: Date.now() } });
                };

                const tryRemove = async (id: number | undefined) => {
                    if (!id) return false;
                    try {
                        await browser.tabs.remove(id);
                        await browser.storage.local.set({
                            lastClose: { success: true, tabId: id, attempts, ts: Date.now() },
                        });
                        return true;
                    } catch (_err) {
                        await recordAttempt(id, _err);
                        return false;
                    }
                };

                if (requestedTabId) {
                    if (await tryRemove(requestedTabId)) {
                        sendResponse({ success: true, attemptedTabId: requestedTabId });
                        return;
                    }
                }

                if (senderTabId && senderTabId !== requestedTabId) {
                    if (await tryRemove(senderTabId)) {
                        sendResponse({ success: true, attemptedTabId: senderTabId });
                        return;
                    }
                }

                if (messageUrl) {
                    try {
                        const tabs = await browser.tabs.query({});
                        const target = messageUrl.split("#")[0].split("?")[0];
                        for (const t of tabs) {
                            if (t && (t as any).id && t.url) {
                                const tUrl = (t as any).url.split("#")[0].split("?")[0];
                                if (
                                    tUrl === target ||
                                    tUrl.startsWith(target) ||
                                    t.url.indexOf("docs.google.com/forms") !== -1
                                ) {
                                    if (await tryRemove((t as any).id)) {
                                        sendResponse({ success: true, attemptedTabId: (t as any).id });
                                        return;
                                    }
                                }
                            }
                        }
                    } catch (_err) {
                        await recordAttempt(undefined, _err);
                    }
                }

                if (senderUrl) {
                    try {
                        const tabs = await browser.tabs.query({ url: senderUrl });
                        for (const t of tabs) {
                            if (t && (t as any).id) {
                                if (await tryRemove((t as any).id)) {
                                    sendResponse({ success: true, attemptedTabId: (t as any).id });
                                    return;
                                }
                            }
                        }
                    } catch (_err) {
                        await recordAttempt(undefined, _err);
                    }
                }

                try {
                    const allTabs = await browser.tabs.query({});
                    for (const t of allTabs) {
                        if (t && (t as any).id && t.url && t.url.includes("docs.google.com/forms")) {
                            if (await tryRemove((t as any).id)) {
                                sendResponse({ success: true, attemptedTabId: (t as any).id });
                                return;
                            }
                        }
                    }
                } catch (_err) {
                    await recordAttempt(undefined, _err);
                }

                await browser.storage.local.set({
                    lastClose: {
                        success: false,
                        tabId: requestedTabId,
                        error: "all attempts failed",
                        attempts,
                        ts: Date.now(),
                    },
                });
                sendResponse({ success: false, attempts });
            })();
            return true;
        }

        if (message.action === "arm_close") {
            const senderTabId = sender && sender.tab && sender.tab.id ? sender.tab.id : undefined;
            const requestedTabId = message && message.tabId ? message.tabId : undefined;
            const tabId = requestedTabId || senderTabId;
            if (tabId) armedTabs.set(tabId, Date.now());
            sendResponse({ success: !!tabId });
            return true;
        }
    });
});
