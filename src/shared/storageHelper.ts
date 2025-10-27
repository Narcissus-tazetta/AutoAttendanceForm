import browser from "webextension-polyfill";

async function isFirefox(): Promise<boolean> {
    try {
        if (typeof navigator !== "undefined" && navigator.userAgent) {
            return navigator.userAgent.includes("Firefox");
        }
        if (typeof browser.runtime.getBrowserInfo === "function") {
            const info = await browser.runtime.getBrowserInfo();
            return info.name === "Firefox";
        }
    } catch (e) {
        void e;
    }
    return false;
}

export interface StorageData {
    userName?: string;
    autoSubmit?: boolean;
}

export async function storageGet(keys: (keyof StorageData)[]): Promise<StorageData> {
    const firefox = await isFirefox();

    if (firefox) {
        try {
            return await browser.storage.local.get(keys);
        } catch (e) {
            return {};
        }
    }

    try {
        const syncData = await browser.storage.sync.get(keys);
        if (syncData && syncData.userName) {
            try {
                await browser.storage.local.set(syncData);
            } catch (e) {
                void e;
            }
            return syncData;
        }
    } catch (e) {
        void e;
    }

    try {
        return await browser.storage.local.get(keys);
    } catch (e) {
        return {};
    }
}

export async function storageSet(data: StorageData): Promise<boolean> {
    const firefox = await isFirefox();

    if (firefox) {
        try {
            await browser.storage.local.set(data);
            return true;
        } catch (e) {
            return false;
        }
    }

    try {
        await browser.storage.sync.set(data);
        try {
            await browser.storage.local.set(data);
        } catch (e) {
            void e;
        }
        return true;
    } catch (e) {
        try {
            await browser.storage.local.set(data);
            return true;
        } catch (e2) {
            return false;
        }
    }
}
