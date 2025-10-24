chrome.storage.local.get(["userName", "autoSubmit"], (result) => {
    if (result && result.userName) {
        document.getElementById("nameInput").value = result.userName;
        document.getElementById("autoSubmit").checked = result.autoSubmit || false;
    } else {
        // migrate from sync if local is empty
        chrome.storage.sync.get(["userName", "autoSubmit"], (syncRes) => {
            if (syncRes && syncRes.userName) {
                chrome.storage.local.set({ userName: syncRes.userName, autoSubmit: syncRes.autoSubmit }, () => {});
                document.getElementById("nameInput").value = syncRes.userName;
                document.getElementById("autoSubmit").checked = syncRes.autoSubmit || false;
            }
        });
    }
});
document.getElementById("save").addEventListener("click", () => {
    const name = document.getElementById("nameInput").value;
    if (name) {
        chrome.storage.local.set({ userName: name }, () => {
            const message = document.getElementById("saveMessage");
            message.style.display = "block";
            setTimeout(() => {
                message.style.display = "none";
            }, 2000);
        });
    }
});
document.getElementById("autoSubmit").addEventListener("change", (e) => {
    chrome.storage.local.set({ autoSubmit: e.target.checked });
});
