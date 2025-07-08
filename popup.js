chrome.storage.sync.get(['userName', 'autoSubmit'], (result) => {
  if (result.userName) {
    document.getElementById('nameInput').value = result.userName;
  }
  document.getElementById('autoSubmit').checked = result.autoSubmit || false;
});
document.getElementById('save').addEventListener('click', () => {
  const name = document.getElementById('nameInput').value;
  if (name) {
    chrome.storage.sync.set({ userName: name }, () => {
      const message = document.getElementById('saveMessage');
      message.style.display = 'block';
      setTimeout(() => {
        message.style.display = 'none';
      }, 2000);
    });
  }
});
document.getElementById('autoSubmit').addEventListener('change', (e) => {
  chrome.storage.sync.set({ autoSubmit: e.target.checked });
});
