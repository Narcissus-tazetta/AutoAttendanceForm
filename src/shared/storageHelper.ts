import browser from "webextension-polyfill";

async function isFirefox(): Promise<boolean> {
    try {
        if (typeof import.meta !== "undefined" && (import.meta as any).env && (import.meta as any).env.FIREFOX) {
            return true;
        }
        if (typeof navigator !== "undefined" && navigator.userAgent) {
            if (navigator.userAgent.includes("Firefox")) return true;
        }
        if (typeof browser.runtime.getBrowserInfo === "function") {
            const info = await browser.runtime.getBrowserInfo();
            return info && info.name === "Firefox";
        }
    } catch {}
    return false;
}

export interface StorageData {
    userName?: string;
    autoSubmit?: boolean;
    autoCloseTab?: boolean;
}

export async function storageGet(keys: (keyof StorageData)[]): Promise<StorageData> {
    const firefox = await isFirefox();

    if (firefox) {
        try {
            return await browser.storage.local.get(keys);
        } catch {
            return {};
        }
    }

    try {
        const syncData = await browser.storage.sync.get(keys);
        const hasAnyRequestedKey = keys.some((key) => syncData[key] !== undefined);
        if (syncData && hasAnyRequestedKey) {
            try {
                await browser.storage.local.set(syncData);
            } catch {
                // ignore
            }
            return syncData;
        }
    } catch {
        // ignore
    }

    try {
        return await browser.storage.local.get(keys);
    } catch {
        return {};
    }
}

export async function storageSet(data: StorageData): Promise<boolean> {
    const firefox = await isFirefox();

    if (firefox) {
        try {
            await browser.storage.local.set(data);
            return true;
        } catch {
            return false;
        }
    }

    try {
        await browser.storage.sync.set(data);
        try {
            await browser.storage.local.set(data);
        } catch {
            // ignore
        }
        return true;
    } catch {
        try {
            await browser.storage.local.set(data);
            return true;
        } catch {
            return false;
        }
    }
}
