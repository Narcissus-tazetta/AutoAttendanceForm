import { SELECTORS, MESSAGES, TIMINGS } from "./selectors";
import browser from "webextension-polyfill";
import { findSubmitButtons as sharedFindSubmitButtons, waitForTextMatch } from "./shared/formUtils";

const detectAttendanceForm = async (): Promise<boolean> => {
    console.debug("[AAF] detectAttendanceForm: start");
    const textOf = (el: Element | null): string => {
        if (!el) return "";
        if ((el as any).innerText !== undefined) return (el as any).innerText || el.textContent || "";
        return el.textContent || "";
    };
    const attendancePattern = /^(出席)(フォーム|確認|登録|チェック)$/;

    const titleContainsToken = (): boolean => {
        const primaryTitleSelectors = ['div[role="heading"]', ".freebirdFormviewerViewHeaderTitle", "h1[data-test-id]"];

        for (const selector of primaryTitleSelectors) {
            const titleElement = document.querySelector(selector);
            if (titleElement) {
                const title = textOf(titleElement).trim();
                console.debug("[AAF] detectAttendanceForm: checking primary title=", title);
                if (title) {
                    if (title.startsWith("出席フォーム")) {
                        console.debug("[AAF] detectAttendanceForm: title starts with attendance keyword");
                        return true;
                    }
                    if (attendancePattern.test(title)) {
                        console.debug("[AAF] detectAttendanceForm: title matches attendance pattern");
                        return true;
                    }
                    if (title.length <= 20 && title.includes("出席フォーム")) {
                        console.debug("[AAF] detectAttendanceForm: short title contains attendance keyword");
                        return true;
                    }
                }
            }
        }
        const metaTitleElement =
            document.querySelector('meta[property="og:title"]') ||
            document.querySelector('meta[name="title"]') ||
            document.querySelector("title");

        if (metaTitleElement) {
            const metaTitle = (metaTitleElement as any).content || textOf(metaTitleElement);
            if (metaTitle) {
                const trimmedTitle = metaTitle.trim();
                console.debug("[AAF] detectAttendanceForm: checking meta title=", trimmedTitle);
                if (trimmedTitle.startsWith("出席フォーム") || attendancePattern.test(trimmedTitle)) {
                    console.debug("[AAF] detectAttendanceForm: meta title matches");
                    return true;
                }
            }
        }

        console.debug("[AAF] detectAttendanceForm: title does not match attendance form criteria");
        return false;
    };

    const hasSubmit = (): boolean => {
        const fromShared = sharedFindSubmitButtons();
        console.debug(`[AAF] detectAttendanceForm: found submit buttons=${fromShared.length}`);
        return fromShared.length > 0;
    };
    if (!titleContainsToken()) {
        console.debug("[AAF] detectAttendanceForm: title check failed, not an attendance form");
        return false;
    }

    console.debug("[AAF] detectAttendanceForm: title check passed");
    return hasSubmit();
};

const clickCheckboxes = (): void => {
    console.debug("[AAF] clickCheckboxes: start");
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
                    console.debug("[AAF] clickCheckboxes: clicked element", element);
                }
            }
        }
    }

    const remainingSelectors = SELECTORS.checkboxSelectors.filter(
        (s) => SELECTORS.priorityCheckboxSelectors.indexOf(s) === -1
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
                    console.debug("[AAF] clickCheckboxes: clicked element", element);
                }
            }
        }
    }
};

const fillInputs = (userName: string): void => {
    console.debug("[AAF] fillInputs: start, userName=", userName);
    for (const selector of SELECTORS.priorityInputSelectors) {
        const elements = Array.prototype.slice.call(document.querySelectorAll(selector)) as any[];
        for (const input of elements) {
            if (input && !input.value && !input.classList.contains("auto-filled")) {
                input.value = userName;
                input.classList.add("auto-filled");
                input.dispatchEvent(new Event("input", { bubbles: true }));
                input.dispatchEvent(new Event("change", { bubbles: true }));
                console.debug("[AAF] fillInputs: filled input", input);
            }
        }
    }

    const remainingSelectors = SELECTORS.inputSelectors.filter(
        (s) => SELECTORS.priorityInputSelectors.indexOf(s) === -1
    );
    for (const selector of remainingSelectors) {
        const elements = Array.prototype.slice.call(document.querySelectorAll(selector)) as any[];
        for (const input of elements) {
            if (input && !input.value && !input.classList.contains("auto-filled")) {
                input.value = userName;
                input.classList.add("auto-filled");
                input.dispatchEvent(new Event("input", { bubbles: true }));
                input.dispatchEvent(new Event("change", { bubbles: true }));
                console.debug("[AAF] fillInputs: filled input", input);
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

const submitForm = (): void => {
    console.debug("[AAF] submitForm: start");
    const buttons = findSubmitButtons();
    for (const submitButton of buttons) {
        const el = submitButton as any;
        if (el && !el.classList.contains("auto-submitted")) {
            console.debug("[AAF] submitForm: clicking button", el, "text=", el.textContent);
            el.click();
            el.classList.add("auto-submitted");

            let tabCloseTriggered = false;

            const checkForCompletion = () => {
                setTimeout(() => {
                    for (const message of MESSAGES.completionMessages) {
                        const found = (document.body.innerText || "").indexOf(message) !== -1;
                        if (found && !tabCloseTriggered) {
                            tabCloseTriggered = true;
                            console.debug("[AAF] submitForm: completion message found", message);
                            browser.runtime.sendMessage({ action: "closeTab" });
                            return;
                        }
                    }
                }, TIMINGS.completionCheck);
            };

            window.addEventListener("beforeunload", () => {
                if (!tabCloseTriggered) {
                    tabCloseTriggered = true;
                    console.debug("[AAF] submitForm: beforeunload triggered, requesting closeTab");
                    browser.runtime.sendMessage({ action: "closeTab" });
                }
            });

            setTimeout(() => {
                if (!tabCloseTriggered) {
                    tabCloseTriggered = true;
                    console.debug("[AAF] submitForm: timeout reached, requesting closeTab");
                    browser.runtime.sendMessage({ action: "closeTab" });
                }
            }, TIMINGS.tabCloseDelay);

            checkForCompletion();
            break;
        }
    }
};

const runFormFiller = async (): Promise<void> => {
    if ((window.location.href as string).indexOf("edit") !== -1) return;
    const ok = await detectAttendanceForm();
    if (!ok) return;

    let userName: string | undefined;
    let autoSubmit = false;
    try {
        const res: any = await browser.storage.sync.get(["userName", "autoSubmit"]);
        userName = res && res.userName;
        autoSubmit = res && res.autoSubmit;
    } catch (e) {
        try {
            const resLocal: any = await browser.storage.local.get(["userName", "autoSubmit"]);
            userName = resLocal && resLocal.userName;
            autoSubmit = resLocal && resLocal.autoSubmit;
        } catch (e2) {}
    }

    if (!userName || userName.trim() === "") return;

    clickCheckboxes();
    fillInputs(userName);

    setTimeout(() => {
        const { allChecked, namesFilled } = checkCompletion();

        if (allChecked && namesFilled) {
            if (autoSubmit) submitForm();
        } else {
            setTimeout(() => {
                if (!allChecked) clickCheckboxes();
                if (!namesFilled) fillInputs(userName);

                let retryCount = 0;
                const retrySubmit = () => {
                    if (retryCount >= TIMINGS.maxRetries) return;

                    setTimeout(() => {
                        const { allChecked: recheckAllChecked, namesFilled: recheckNamesFilled } = checkCompletion();

                        if (recheckAllChecked && recheckNamesFilled) {
                            if (autoSubmit) submitForm();
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

if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", runFormFiller);
} else {
    runFormFiller();
}

setTimeout(runFormFiller, TIMINGS.fallbackRun);
