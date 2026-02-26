import { MESSAGES, SELECTORS, TIMINGS } from "./selectors";
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

const hasCompletionMessage = (): boolean => {
    const bodyText = document.body?.innerText || document.body?.textContent || "";
    const docText = document.documentElement?.textContent || "";
    const text = `${bodyText}\n${docText}`;
    if (!text) return false;
    for (const msg of MESSAGES.completionMessages) {
        if (text.indexOf(msg) !== -1) return true;
    }
    return false;
};

const isResponseUrl = (): boolean => location.href.indexOf("formResponse") !== -1;

const textOf = (el: Element | null): string => {
    if (!el) return "";
    return ((el as HTMLElement).innerText || el.textContent || "").trim();
};

const isVisible = (el: Element): boolean => {
    const node = el as HTMLElement;
    if (!node) return false;
    if (node.getAttribute("hidden") !== null) return false;
    const style = window.getComputedStyle(node);
    if (style.display === "none" || style.visibility === "hidden") return false;
    const rect = node.getBoundingClientRect();
    return rect.width > 0 && rect.height > 0;
};

const getActionButtons = (): HTMLElement[] => {
    const nodes = Array.from(
        document.querySelectorAll(
            'button, [role="button"], div[role="button"], input[type="submit"], input[type="button"]',
        ),
    ) as HTMLElement[];
    return nodes.filter((n) => isVisible(n));
};

const hasNextButtonVisible = (): boolean => {
    const rx = /次へ|next/i;
    return getActionButtons().some((btn) => {
        const txt = `${textOf(btn)} ${(btn.getAttribute("aria-label") || "").trim()}`;
        return rx.test(txt);
    });
};

const hasSubmitButtonVisible = (): boolean => {
    const rx = /送信|submit/i;
    return getActionButtons().some((btn) => {
        const txt = `${textOf(btn)} ${(btn.getAttribute("aria-label") || "").trim()}`;
        return rx.test(txt);
    });
};

const hasValidationError = (): boolean => {
    const alertNodes = Array.from(
        document.querySelectorAll('[role="alert"], .freebirdFormviewerViewItemsItemErrorMessage'),
    );
    for (const node of alertNodes) {
        if (!isVisible(node)) continue;
        const txt = textOf(node);
        if (/必須|required|入力してください|この質問は必須/i.test(txt)) return true;
    }
    const pageText = document.body?.innerText || "";
    return /必須項目|必須の質問|This is a required question/i.test(pageText);
};

const hasAnotherResponseSignal = (): boolean => {
    const pageText = document.body?.innerText || document.body?.textContent || "";
    return /別の回答を送信|Submit another response|回答を送信済み|Your response has been recorded/i.test(pageText);
};

const isStrongCompletionSignal = (): boolean => {
    const completionMessage = hasCompletionMessage();
    const anotherResponse = hasAnotherResponseSignal();
    const nextVisible = hasNextButtonVisible();
    const submitVisible = hasSubmitButtonVisible();
    const validationError = hasValidationError();
    if (nextVisible || validationError) return false;
    if (!completionMessage && !anotherResponse) return false;
    if (submitVisible && !anotherResponse) return false;
    return true;
};

const waitForCompletionSignal = (timeoutMs = 30000, urlFallbackDelayMs = 1500): Promise<boolean> => {
    return new Promise((resolve) => {
        let timeout: any = null;
        let urlPollInterval: any = null;
        let completionPollInterval: any = null;
        let observer: MutationObserver | null = null;
        let responseDetectedAt: number | null = isResponseUrl() ? Date.now() : null;

        const cleanup = () => {
            if (timeout) clearTimeout(timeout);
            if (urlPollInterval) clearInterval(urlPollInterval);
            if (completionPollInterval) clearInterval(completionPollInterval);
            if (observer) observer.disconnect();
            window.removeEventListener("popstate", evaluate);
            window.removeEventListener("hashchange", evaluate);
        };

        const finish = (ok: boolean) => {
            cleanup();
            resolve(ok);
        };

        function evaluate() {
            const responseNow = isResponseUrl();
            if (responseNow && responseDetectedAt == null) responseDetectedAt = Date.now();

            const completionMessage = hasCompletionMessage();
            const anotherResponse = hasAnotherResponseSignal();
            const nextVisible = hasNextButtonVisible();
            const submitVisible = hasSubmitButtonVisible();
            const validationError = hasValidationError();

            if (nextVisible || validationError) return;

            if (isStrongCompletionSignal()) {
                finish(true);
                return;
            }

            if (!responseNow) return;

            let positiveScore = 0;
            positiveScore += 1;
            if (completionMessage) positiveScore += 2;
            if (anotherResponse) positiveScore += 2;
            if (!submitVisible) positiveScore += 1;

            if (positiveScore >= 3) {
                finish(true);
                return;
            }

            if (responseNow && responseDetectedAt != null) {
                if (Date.now() - responseDetectedAt >= urlFallbackDelayMs && !submitVisible) {
                    finish(true);
                }
            }
        }

        timeout = setTimeout(() => finish(false), timeoutMs);

        window.addEventListener("popstate", evaluate);
        window.addEventListener("hashchange", evaluate);

        urlPollInterval = setInterval(() => {
            try {
                evaluate();
            } catch {}
        }, 250);

        completionPollInterval = setInterval(() => {
            try {
                evaluate();
            } catch {}
        }, 150);

        const target = document.body || document.documentElement;
        if (target) {
            observer = new MutationObserver(() => {
                try {
                    evaluate();
                } catch {}
            });
            observer.observe(target, { childList: true, subtree: true, characterData: true });
        }

        evaluate();
    });
};

const submitForm = async (autoSubmit = false): Promise<boolean> => {
    if (!autoSubmit) return false;

    const buttons = findSubmitButtons();
    if (buttons.length === 0) return false;

    const submitBtn = buttons[0] as HTMLElement;
    if (!submitBtn || submitBtn.classList.contains("auto-submitted")) return false;

    submitBtn.click();
    submitBtn.classList.add("auto-submitted");

    try {
        const completionOk = await waitForCompletionSignal(30000, 1500);
        if (!completionOk) throw new Error("Timeout waiting for completion signal");
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

async function permitClose() {
    try {
        await browser.runtime.sendMessage({ action: "permit_close", tabId: __cachedTabId, url: location.href });
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
        await permitClose();
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
    let urlPollInterval: any = null;
    let closeFlowStarted = false;

    const cleanup = () => {
        if (urlPollInterval) clearInterval(urlPollInterval);
        window.removeEventListener("popstate", onUrlChange);
        window.removeEventListener("hashchange", onUrlChange);
    };

    const maybeStartCloseFlow = () => {
        if (__closeTriggered) return;
        if (!isResponseUrl() && !isStrongCompletionSignal()) return;
        if (closeFlowStarted) return;
        closeFlowStarted = true;
        (async () => {
            const completionOk = await waitForCompletionSignal(12000, 1800);
            if (!completionOk) {
                closeFlowStarted = false;
                return;
            }
            cleanup();
            await triggerClose();
        })();
    };

    const onUrlChange = () => {
        maybeStartCloseFlow();
    };

    window.addEventListener("popstate", onUrlChange);
    window.addEventListener("hashchange", onUrlChange);
    urlPollInterval = setInterval(() => {
        try {
            maybeStartCloseFlow();
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
