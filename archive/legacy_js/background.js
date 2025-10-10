```javascript
chrome.runtime.onMessage.addListener((message, sender) => {
    if (message.action === "closeTab" && sender.tab) {
        setTimeout(() => {
            chrome.tabs.remove(sender.tab.id);
        }, 1000);
    }
});

```;
