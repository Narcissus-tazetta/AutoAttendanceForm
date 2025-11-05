import { SELECTORS, MESSAGES, TIMINGS } from "./selectors";
import browser from "webextension-polyfill";
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

    const getLabelText = (el: Element): string => {
        const input = el as HTMLInputElement;
        if (input.id) {
            const l = document.querySelector(`label[for="${input.id}"]`);
            if (l) return textOf(l).trim();
        }
        const ariaLabel = input.getAttribute && input.getAttribute("aria-label");
        if (ariaLabel) return ariaLabel;
        const ariaLabelledBy = input.getAttribute && input.getAttribute("aria-labelledby");
        if (ariaLabelledBy) {
            const ids = (ariaLabelledBy || "").split(/\s+/).filter(Boolean);
            const parts: string[] = [];
            for (const id of ids) {
                const ref = document.getElementById(id);
                if (ref) parts.push(textOf(ref).trim());
            }
            if (parts.length) return parts.join(" ");
        }
        if ((input as any).placeholder) return (input as any).placeholder;
        const parentLabel = input.closest("label");
        if (parentLabel) return textOf(parentLabel).trim();
        const prev = input.previousElementSibling;
        if (prev) return textOf(prev).trim();
        return "";
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

    const nameLabel = getLabelText(nameInput);
    if (!/氏名|名前|フル\s*ネーム|name/i.test(nameLabel)) return false;

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
            'input, textarea, select, [role="radio"], [role="checkbox"], [role="listbox"], [role="combobox"], [role="switch"]'
        )
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
    const buttons = findSubmitButtons();
    for (const submitButton of buttons) {
        const el = submitButton as any;
        if (el && !el.classList.contains("auto-submitted")) {
            el.click();
            el.classList.add("auto-submitted");

            let tabCloseTriggered = false;

            const checkForCompletion = () => {
                setTimeout(() => {
                    for (const message of MESSAGES.completionMessages) {
                        const found = (document.body.innerText || "").indexOf(message) !== -1;
                        if (found && !tabCloseTriggered) {
                            tabCloseTriggered = true;
                            browser.runtime.sendMessage({ action: "closeTab" });
                            return;
                        }
                    }
                }, TIMINGS.completionCheck);
            };

            window.addEventListener("beforeunload", () => {
                if (!tabCloseTriggered) {
                    tabCloseTriggered = true;
                    browser.runtime.sendMessage({ action: "closeTab" });
                }
            });

            setTimeout(() => {
                if (!tabCloseTriggered) {
                    tabCloseTriggered = true;
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
        const data = await storageGet(["userName", "autoSubmit"]);
        userName = data.userName;
        autoSubmit = data.autoSubmit || false;
    } catch (e) {}

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
