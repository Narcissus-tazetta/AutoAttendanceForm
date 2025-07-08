// 名前をストレージから読み込んで表示
chrome.storage.sync.get(['userName'], (result) => {
  if (result.userName) {
    document.getElementById('nameInput').value = result.userName;
  }
});

// 名前を保存
document.getElementById('save').addEventListener('click', () => {
  const name = document.getElementById('nameInput').value;
  if (name) {
    chrome.storage.sync.set({ userName: name }, () => {
      alert('名前を保存しました: ' + name);
    });
  }
});

// 自動入力実行
document.getElementById('run').addEventListener('click', async () => {
  const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
  chrome.scripting.executeScript({
    target: { tabId: tab.id },
    files: ['content.js']
  });
});
