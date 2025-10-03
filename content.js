(function () {
    const detectAttendanceForm = () => {
        for (const selector of SELECTORS.titleSelectors) {
            const element = document.querySelector(selector);
            if (element) {
                const title = element.content || element.innerText || element.textContent || "";
                if (title && title.includes("出席")) return true;
            }
        }

        const bodyText = document.body.innerText || document.body.textContent || "";
        if (bodyText.includes("出席")) return true;

        return false;
    };

    const clickCheckboxes = () => {
        for (const selector of SELECTORS.priorityCheckboxSelectors) {
            const elements = document.querySelectorAll(selector);
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
            (s) => !SELECTORS.priorityCheckboxSelectors.includes(s)
        );
        for (const selector of remainingSelectors) {
            const elements = document.querySelectorAll(selector);
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

    const fillInputs = (userName) => {
        for (const selector of SELECTORS.priorityInputSelectors) {
            const elements = document.querySelectorAll(selector);
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
            (s) => !SELECTORS.priorityInputSelectors.includes(s)
        );
        for (const selector of remainingSelectors) {
            const elements = document.querySelectorAll(selector);
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

    const checkCompletion = () => {
        let allChecked = true;
        let namesFilled = true;

        for (const selector of SELECTORS.priorityCheckboxSelectors) {
            const elements = document.querySelectorAll(selector);
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
            const elements = document.querySelectorAll(selector);
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

    const submitForm = () => {
        for (const selector of SELECTORS.submitSelectors) {
            const submitButton = document.querySelector(selector);
            if (submitButton && !submitButton.classList.contains("auto-submitted")) {
                submitButton.click();
                submitButton.classList.add("auto-submitted");

                let tabCloseTriggered = false;

                const checkForCompletion = () => {
                    setTimeout(() => {
                        for (const message of MESSAGES.completionMessages) {
                            if (document.body.innerText.includes(message) && !tabCloseTriggered) {
                                tabCloseTriggered = true;
                                chrome.runtime.sendMessage({ action: "closeTab" });
                                return;
                            }
                        }
                    }, TIMINGS.completionCheck);
                };

                window.addEventListener("beforeunload", () => {
                    if (!tabCloseTriggered) {
                        tabCloseTriggered = true;
                        chrome.runtime.sendMessage({ action: "closeTab" });
                    }
                });

                setTimeout(() => {
                    if (!tabCloseTriggered) {
                        tabCloseTriggered = true;
                        chrome.runtime.sendMessage({ action: "closeTab" });
                    }
                }, TIMINGS.tabCloseDelay);

                checkForCompletion();
                break;
            }
        }
    };
    const runFormFiller = () => {
        if (window.location.href.includes("edit")) return;
        if (!detectAttendanceForm()) return;

        chrome.storage.sync.get(["userName", "autoSubmit"], (result) => {
            const userName = result.userName;
            const autoSubmit = result.autoSubmit || false;

            if (!userName || userName.trim() === "") {
                return;
            }

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
                                const { allChecked: recheckAllChecked, namesFilled: recheckNamesFilled } =
                                    checkCompletion();

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
        });
    };

    if (document.readyState === "loading") {
        document.addEventListener("DOMContentLoaded", runFormFiller);
    } else {
        runFormFiller();
    }

    setTimeout(runFormFiller, TIMINGS.fallbackRun);
})();
