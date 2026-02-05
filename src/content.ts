import { SELECTORS, TIMINGS } from "./selectors";
import { browser } from "wxt/browser";
import { findSubmitButtons as sharedFindSubmitButtons } from "./shared/formUtils";
import { storageGet } from "./shared/storageHelper";

const detectAttendanceForm = async (): Promise<boolean> => {
    const textOf = (el: Element | null): string => {
        if (!el) return "";
        if ((el as any).innerText !== undefined) return (el as any).innerText || el.textContent || "";
        return el.textContent || "";
    };

    const titleOk = (): boolean => {
        const primary = [
            'div[role="heading"]',
            ".freebirdFormviewerViewHeaderTitle",
            "h1[data-test-id]",
            'meta[itemprop="name"]',
            "title",
        ];
        for (const sel of primary) {
            const el = document.querySelector(sel);
            if (!el) continue;
            const t = textOf(el).trim();
            if (!t) continue;
            if (t.indexOf("出席") !== -1) return true;
        }
        const meta =
            document.querySelector('meta[property="og:title"]') || document.querySelector('meta[name="title"]');
        if (meta) {
            const m = (meta as any).content || textOf(meta);
            if (m && m.indexOf("出席") !== -1) return true;
        }
        return false;
    };

    const form = document.querySelector('form[action*="/formResponse"]') || document.querySelector("form");
    if (!form) return false;

    const submitButtons = sharedFindSubmitButtons(form);
    if (submitButtons.length === 0) return false;

    if (!titleOk()) return false;

    const isVisible = (el: Element): boolean => {
        const e = el as HTMLElement;
        if (!e) return false;
        if (e.getAttribute && e.getAttribute("hidden") !== null) return false;
        if ((e as any).offsetParent === null && e.tagName.toLowerCase() !== "input") return false;
        const rect = e.getBoundingClientRect();
        if (rect.width === 0 && rect.height === 0) return false;
        return true;
    };

    const textInputs = Array.from(form.querySelectorAll('input[type="text"]')).filter((c) => {
        const el = c as HTMLInputElement;
        if (!isVisible(c)) return false;
        if (el.type === "hidden") return false;
        if (el.disabled) return false;
        return true;
    });
    if (textInputs.length !== 1) return false;
    const nameInput = textInputs[0] as HTMLInputElement;

    const findEmailCheckbox = (): Element | null => {
        const candidates = Array.from(document.querySelectorAll('[role="checkbox"]')) as Element[];
        for (const c of candidates) {
            if (!isVisible(c)) continue;
            const txt = textOf(c).trim();
            const ariaLabel = (c as HTMLElement).getAttribute && (c as HTMLElement).getAttribute("aria-label");
            const combinedText = txt + " " + (ariaLabel || "");
            if (/返信に表示するメールアドレス|メールアドレスとして|記録する|Collect email|email/i.test(combinedText))
                return c;
        }
        return null;
    };

    const emailCheckbox = findEmailCheckbox();
    if (!emailCheckbox) return false;

    const allInteractive = Array.from(
        form.querySelectorAll(
            'input, textarea, select, [role="radio"], [role="checkbox"], [role="listbox"], [role="combobox"], [role="switch"]',
        ),
    ).filter((n) => {
        if (!isVisible(n)) return false;
        const el = n as HTMLInputElement;
        if (el.type === "hidden") return false;
        return true;
    });

    const allowed = new Set<Element>([nameInput as Element, emailCheckbox]);
    const forbidden = allInteractive.filter((n) => {
        if (allowed.has(n)) return false;
        const el = n as HTMLInputElement;
        const typ = (el.type || "").toLowerCase();
        if (typ === "text") return false;
        return true;
    });

    if (forbidden.length > 0) return false;

    return true;
};

const clickCheckboxes = (): void => {
    for (const selector of SELECTORS.priorityCheckboxSelectors) {
        const elements = Array.prototype.slice.call(document.querySelectorAll(selector)) as any[];
        for (const element of elements) {
            if (element && !element.classList.contains("auto-clicked")) {
                const checkbox = element.querySelector('[role="checkbox"]') || element;
                const isChecked =
                    checkbox.getAttribute("aria-checked") === "true" ||
                    checkbox.checked ||
                    checkbox.classList.contains("checked") ||
                    element.querySelector(".checked");
                if (!isChecked) {
                    element.click();
                    element.classList.add("auto-clicked");
                }
            }
        }
    }

    const remainingSelectors = SELECTORS.checkboxSelectors.filter(
        (s) => SELECTORS.priorityCheckboxSelectors.indexOf(s) === -1,
    );
    for (const selector of remainingSelectors) {
        const elements = Array.prototype.slice.call(document.querySelectorAll(selector)) as any[];
        for (const element of elements) {
            if (element && !element.classList.contains("auto-clicked")) {
                const checkbox = element.querySelector('[role="checkbox"]') || element;
                const isChecked =
                    checkbox.getAttribute("aria-checked") === "true" ||
                    checkbox.checked ||
                    checkbox.classList.contains("checked") ||
                    element.querySelector(".checked");
                if (!isChecked) {
                    element.click();
                    element.classList.add("auto-clicked");
                }
            }
        }
    }
};

const fillInputs = (userName: string): void => {
    for (const selector of SELECTORS.priorityInputSelectors) {
        const elements = Array.prototype.slice.call(document.querySelectorAll(selector)) as any[];
        for (const input of elements) {
            if (input && !input.value && !input.classList.contains("auto-filled")) {
                input.value = userName;
                input.classList.add("auto-filled");
                input.dispatchEvent(new Event("input", { bubbles: true }));
                input.dispatchEvent(new Event("change", { bubbles: true }));
            }
        }
    }

    const remainingSelectors = SELECTORS.inputSelectors.filter(
        (s) => SELECTORS.priorityInputSelectors.indexOf(s) === -1,
    );
    for (const selector of remainingSelectors) {
        const elements = Array.prototype.slice.call(document.querySelectorAll(selector)) as any[];
        for (const input of elements) {
            if (input && !input.value && !input.classList.contains("auto-filled")) {
                input.value = userName;
                input.classList.add("auto-filled");
                input.dispatchEvent(new Event("input", { bubbles: true }));
                input.dispatchEvent(new Event("change", { bubbles: true }));
            }
        }
    }
};

const checkCompletion = (): { allChecked: boolean; namesFilled: boolean } => {
    let allChecked = true;
    let namesFilled = true;

    for (const selector of SELECTORS.priorityCheckboxSelectors) {
        const elements = Array.prototype.slice.call(document.querySelectorAll(selector)) as any[];
        for (const element of elements) {
            const checkbox = element.querySelector('[role="checkbox"]') || element;
            const isChecked =
                checkbox.getAttribute("aria-checked") === "true" ||
                checkbox.checked ||
                checkbox.classList.contains("checked") ||
                element.querySelector(".checked");
            if (!isChecked) {
                allChecked = false;
                break;
            }
        }
        if (!allChecked) break;
    }

    for (const selector of SELECTORS.priorityInputSelectors) {
        const elements = Array.prototype.slice.call(document.querySelectorAll(selector)) as any[];
        for (const input of elements) {
            if (input && !input.value.trim()) {
                namesFilled = false;
                break;
            }
        }
        if (!namesFilled) break;
    }

    return { allChecked, namesFilled };
};

const findSubmitButtons = (scope: ParentNode = document): Element[] => sharedFindSubmitButtons(scope);

const submitForm = async (autoSubmit = false): Promise<boolean> => {
    if (!autoSubmit) return false;

    const buttons = findSubmitButtons();
    if (buttons.length === 0) return false;

    const submitBtn = buttons[0] as HTMLElement;
    if (!submitBtn || submitBtn.classList.contains("auto-submitted")) return false;

    submitBtn.click();
    submitBtn.classList.add("auto-submitted");

    const initialHref = location.href;

    const waitForCompletion = new Promise<void>((resolve, reject) => {
        let timeout: any = null;
        let urlPollInterval: any = null;

        const cleanup = () => {
            if (timeout) clearTimeout(timeout);
            if (urlPollInterval) clearInterval(urlPollInterval);
            window.removeEventListener("popstate", onUrlChange);
            window.removeEventListener("hashchange", onUrlChange);
        };

        const onUrlChange = () => {
            if (location.href !== initialHref) {
                cleanup();
                console.log("URL changed detected:", location.href);
                resolve();
            }
        };

        timeout = setTimeout(() => {
            cleanup();
            reject(new Error("Timeout waiting for submission (30s)"));
        }, 30000);

        window.addEventListener("popstate", onUrlChange);
        window.addEventListener("hashchange", onUrlChange);
        urlPollInterval = setInterval(() => {
            try {
                onUrlChange();
            } catch {}
        }, 250);
    });

    try {
        await waitForCompletion;
        await new Promise((r) => setTimeout(r, 100));
        return await triggerClose();
    } catch (e) {
        console.error("Submission verification failed:", e);
        return false;
    }
};

const waitForForm = async (): Promise<boolean> => {
    const maxDuration = 10000;
    const interval = 500;
    const startTime = Date.now();

    return new Promise((resolve) => {
        const check = async () => {
            const isMatch = await detectAttendanceForm();
            if (isMatch) {
                resolve(true);
                return;
            }
            if (Date.now() - startTime > maxDuration) {
                resolve(false);
                return;
            }
            setTimeout(check, interval);
        };
        check();
    });
};

let __cachedTabId: number | undefined;
let __closeTriggered = false;
let __urlWatcherActive = false;
let __closeArmed = false;

async function ensureTabId() {
    if (__cachedTabId) return;
    const maxAttempts = 3;
    for (let i = 0; i < maxAttempts; i++) {
        try {
            const res: any = await browser.runtime.sendMessage({ action: "identifyTab", url: location.href });
            if (res && res.tabId) {
                __cachedTabId = res.tabId;
                return;
            }
        } catch {}
        await new Promise((r) => setTimeout(r, 200));
    }
}

async function armClose() {
    if (__closeArmed) return;
    __closeArmed = true;
    try {
        await browser.runtime.sendMessage({ action: "arm_close", tabId: __cachedTabId, url: location.href });
    } catch {}
}

async function closeTabWithRetry(maxAttempts = 3) {
    await ensureTabId();
    for (let attempt = 1; attempt <= maxAttempts; attempt++) {
        try {
            await browser.runtime.sendMessage({ action: "close_tab", tabId: __cachedTabId });
            await browser.storage.local.set({
                lastCloseSent: { success: true, tabId: __cachedTabId, attempt, ts: Date.now() },
            });
        } catch (_err) {
            await browser.storage.local.set({
                lastCloseSent: { success: false, tabId: __cachedTabId, attempt, error: String(_err), ts: Date.now() },
            });
        }

        await new Promise((r) => setTimeout(r, 350));
        try {
            const st: any = await browser.storage.local.get("lastClose");
            if (st && st.lastClose && st.lastClose.success) return true;
        } catch {}
    }
    return false;
}

async function triggerClose(): Promise<boolean> {
    if (__closeTriggered) return true;
    __closeTriggered = true;
    try {
        const res: any = await browser.runtime.sendMessage({
            action: "close_window",
            tabId: __cachedTabId,
            url: location.href,
        });
        if (res && res.success) return true;
        const fallback = await closeTabWithRetry();
        return fallback;
    } catch {
        return false;
    }
}

function setupUrlCloseWatcher() {
    if (__urlWatcherActive) return;
    __urlWatcherActive = true;
    const startHref = location.href;
    let urlPollInterval: any = null;

    const cleanup = () => {
        if (urlPollInterval) clearInterval(urlPollInterval);
        window.removeEventListener("popstate", onUrlChange);
        window.removeEventListener("hashchange", onUrlChange);
    };

    const onUrlChange = () => {
        if (__closeTriggered) return;
        if (location.href === startHref) return;
        if (location.href.indexOf("formResponse") === -1) return;
        cleanup();
        triggerClose();
    };

    window.addEventListener("popstate", onUrlChange);
    window.addEventListener("hashchange", onUrlChange);
    urlPollInterval = setInterval(() => {
        try {
            onUrlChange();
        } catch {}
    }, 250);
}

export const runFormFiller = async (): Promise<void> => {
    if (window.location.pathname.endsWith("/edit")) return;

    setupUrlCloseWatcher();

    await ensureTabId();
    await armClose();

    const ok = await waitForForm();
    if (!ok) {
        return;
    }

    setupUrlCloseWatcher();

    let userName: string | undefined;
    let autoSubmit = false;

    try {
        const data = await storageGet(["userName", "autoSubmit"]);
        userName = data.userName;
        autoSubmit = data.autoSubmit || false;
    } catch {}

    if (!userName || userName.trim() === "") return;

    clickCheckboxes();
    fillInputs(userName);

    setTimeout(async () => {
        const { allChecked, namesFilled } = checkCompletion();

        if (allChecked && namesFilled) {
            if (autoSubmit) await submitForm(autoSubmit);
        } else {
            setTimeout(async () => {
                if (!allChecked) clickCheckboxes();
                if (!namesFilled) fillInputs(userName);

                let retryCount = 0;
                const retrySubmit = async () => {
                    if (retryCount >= TIMINGS.maxRetries) return;

                    setTimeout(async () => {
                        const { allChecked: recheckAllChecked, namesFilled: recheckNamesFilled } = checkCompletion();

                        if (recheckAllChecked && recheckNamesFilled) {
                            if (autoSubmit) await submitForm(autoSubmit);
                        } else {
                            retryCount++;
                            retrySubmit();
                        }
                    }, TIMINGS.retryInterval);
                };

                retrySubmit();
            }, TIMINGS.retryInterval);
        }
    }, TIMINGS.completionCheck);
};

export function initContentScript() {
    if (document.readyState === "loading") {
        document.addEventListener("DOMContentLoaded", runFormFiller);
    } else {
        runFormFiller();
    }

    setTimeout(runFormFiller, TIMINGS.fallbackRun);
}
