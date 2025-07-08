// 名前をストレージから読み込んで表示
chrome.storage.sync.get(['userName', 'autoSubmit'], (result) => {
  if (result.userName) {
    document.getElementById('nameInput').value = result.userName;
  }
  // 自動送信の設定を読み込み（デフォルトはfalse）
  document.getElementById('autoSubmit').checked = result.autoSubmit || false;
});

// 名前を保存
document.getElementById('save').addEventListener('click', () => {
  const name = document.getElementById('nameInput').value;
  if (name) {
    chrome.storage.sync.set({ userName: name }, () => {
      // 保存完了メッセージを表示
      const message = document.getElementById('saveMessage');
      message.style.display = 'block';
      setTimeout(() => {
        message.style.display = 'none';
      }, 2000); // 2秒後に非表示
    });
  }
});

// 自動送信設定を保存
document.getElementById('autoSubmit').addEventListener('change', (e) => {
  chrome.storage.sync.set({ autoSubmit: e.target.checked });
});
