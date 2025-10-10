import browser from "webextension-polyfill";

const nameInput = document.getElementById("nameInput") as HTMLInputElement | null;
const saveButton = document.getElementById("save") as HTMLButtonElement | null;
const saveMessage = document.getElementById("saveMessage") as HTMLElement | null;
const autoSubmitCheckbox = document.getElementById("autoSubmit") as HTMLInputElement | null;

browser.storage.sync.get(["userName", "autoSubmit"]).then((result: any) => {
    if (nameInput && result.userName) nameInput.value = result.userName;
    if (autoSubmitCheckbox) autoSubmitCheckbox.checked = result.autoSubmit || false;
});

if (saveButton && nameInput && saveMessage) {
    saveButton.addEventListener("click", () => {
        const name = nameInput.value;
        if (name) {
            browser.storage.sync.set({ userName: name }).then(() => {
                saveMessage.style.display = "block";
                setTimeout(() => {
                    saveMessage.style.display = "none";
                }, 2000);
            });
        }
    });
}

if (autoSubmitCheckbox) {
    autoSubmitCheckbox.addEventListener("change", (e: Event) => {
        const target = e.target as HTMLInputElement;
        browser.storage.sync.set({ autoSubmit: target.checked });
    });
}
