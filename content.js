(function () {
    const titleSelectors = [
        'meta[itemprop="name"]',
        ".freebirdFormviewerViewHeaderTitle",
        ".F9yp7e.ikZYwf.LgNcQe",
        ".ahS2Le .F9yp7e",
        'div[role="heading"]',
        "h1",
        '[data-params*="title"]',
    ];

    const checkboxSelectors = [
        "label.OLkl6c",
        "label.docssharedWizToggleLabeledContainer",
        'div[role="checkbox"]',
        'input[type="checkbox"]',
        'label[for*="checkbox"]',
        ".freebirdFormviewerComponentsQuestionCheckboxRoot label",
    ];

    const inputSelectors = [
        "input.whsOnd.zHQkBf",
        'input[type="text"]',
        'input[type="email"]',
        "textarea",
        ".freebirdFormviewerComponentsQuestionTextRoot input",
        '[jsname="YPqjbf"]',
        'input[aria-label*="名前"]',
        'input[aria-label*="氏名"]',
        'input[placeholder*="名前"]',
    ];

    const submitSelectors = [
        'div[role="button"][aria-label="Submit"]',
        'div[jsname="M2UYVd"]',
        "div.uArJ5e.UQuaGc.Y5sE8d.VkkpIf.QvWxOd",
        'span:contains("送信")',
        '[aria-label*="送信"]',
        '[aria-label*="Submit"]',
    ];

    const detectAttendanceForm = () => {
        for (const selector of titleSelectors) {
            const element = document.querySelector(selector);
            if (element) {
                const title = element.content || element.innerText || element.textContent || "";
                if (title && title.includes("出席")) return true;
            }
        }

        const allElements = document.querySelectorAll("*");
        for (const element of allElements) {
            const directText = Array.from(element.childNodes)
                .filter((node) => node.nodeType === Node.TEXT_NODE)
                .map((node) => node.textContent.trim())
                .join(" ");

            const fullText = element.innerText || element.textContent || "";

            if ((directText.includes("出席") || fullText.includes("出席")) && fullText.length < 200) {
                return true;
            }
        }

        return false;
    };

    const clickCheckboxes = () => {
        checkboxSelectors.forEach((selector) => {
            const elements = document.querySelectorAll(selector);
            elements.forEach((element) => {
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
            });
        });
    };

    const fillInputs = (userName) => {
        inputSelectors.forEach((selector) => {
            const elements = document.querySelectorAll(selector);
            elements.forEach((input) => {
                if (input && !input.value && !input.classList.contains("auto-filled")) {
                    input.value = userName;
                    input.classList.add("auto-filled");
                    input.dispatchEvent(new Event("input", { bubbles: true }));
                    input.dispatchEvent(new Event("change", { bubbles: true }));
                    input.dispatchEvent(new Event("blur", { bubbles: true }));
                }
            });
        });
    };

    const checkCompletion = () => {
        let allChecked = true;
        let namesFilled = true;

        checkboxSelectors.forEach((selector) => {
            const elements = document.querySelectorAll(selector);
            elements.forEach((element) => {
                const checkbox = element.querySelector('[role="checkbox"]') || element;
                const isChecked =
                    checkbox.getAttribute("aria-checked") === "true" ||
                    checkbox.checked ||
                    checkbox.classList.contains("checked") ||
                    element.querySelector(".checked");
                if (!isChecked) allChecked = false;
            });
        });

        inputSelectors.forEach((selector) => {
            const elements = document.querySelectorAll(selector);
            elements.forEach((input) => {
                if (input && !input.value.trim()) namesFilled = false;
            });
        });

        return { allChecked, namesFilled };
    };

    const submitForm = () => {
        for (const selector of submitSelectors) {
            const submitButton = document.querySelector(selector);
            if (submitButton && !submitButton.classList.contains("auto-submitted")) {
                submitButton.click();
                submitButton.classList.add("auto-submitted");
                break;
            }
        }
    };

    const runFormFiller = () => {
        if (!detectAttendanceForm()) return;

        clickCheckboxes();

        chrome.storage.sync.get(["userName", "autoSubmit"], (result) => {
            const userName = result.userName || "山田太郎";
            const autoSubmit = result.autoSubmit || false;

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
                            if (retryCount >= 3) return;

                            setTimeout(() => {
                                const { allChecked: recheckAllChecked, namesFilled: recheckNamesFilled } =
                                    checkCompletion();

                                if (recheckAllChecked && recheckNamesFilled) {
                                    if (autoSubmit) submitForm();
                                } else {
                                    retryCount++;
                                    retrySubmit();
                                }
                            }, 1000);
                        };

                        retrySubmit();
                    }, 1000);
                }
            }, 1500);
        });
    };

    if (document.readyState === "loading") {
        document.addEventListener("DOMContentLoaded", runFormFiller);
    } else {
        runFormFiller();
    }

    setTimeout(runFormFiller, 2000);
})();
