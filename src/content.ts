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

    const titleContainsToken = (): boolean => {
        for (const selector of SELECTORS.titleSelectors) {
            const el = document.querySelector(selector) as any;
            if (el) {
                const title = el.content || textOf(el);
                if (title && title.indexOf("出席フォーム") !== -1) return true;
            }
        }
        const headings = Array.prototype.slice.call(
            document.querySelectorAll('div[role="heading"], h1, h2, h3')
        ) as Element[];
        for (const h of headings) {
            if (textOf(h).indexOf("出席フォーム") !== -1) return true;
        }
        return false;
    };

    const hasSubmit = (): boolean => {
        const fromShared = sharedFindSubmitButtons();
        console.debug(`[AAF] detectAttendanceForm: found submit buttons=${fromShared.length}`);
        return fromShared.length > 0;
    };

    if (titleContainsToken()) {
        console.debug("[AAF] detectAttendanceForm: titleContainsToken=true");
        return hasSubmit();
    }
    try {
        console.debug("[AAF] detectAttendanceForm: waiting for text match");
        const found = await waitForTextMatch(["出席フォーム"], TIMINGS.completionCheck * 6);
        console.debug("[AAF] detectAttendanceForm: waitForTextMatch result=", !!found);
        if (found) return hasSubmit();
    } catch (e) {
        console.debug("[AAF] detectAttendanceForm: waitForTextMatch error", e);
    }

    return false;
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
