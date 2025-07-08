// Googleフォームの汎用自動入力スクリプト
(function() {
  // タイトル取得（複数パターンに対応）
  const titleSelectors = [
    'meta[itemprop="name"]',
    '.freebirdFormviewerViewHeaderTitle',
    'h1',
    '[data-params*="title"]'
  ];
  
  let title = '';
  for (const selector of titleSelectors) {
    const element = document.querySelector(selector);
    if (element) {
      title = element.content || element.innerText || element.textContent || '';
      if (title) break;
    }
  }
  
  if (!title.includes('出席')) return; // 出席フォームでなければ何もしない

  // チェックボックス/ラベルの自動クリック（複数パターンに対応）
  const checkboxSelectors = [
    'label.OLkl6c',
    'label.docssharedWizToggleLabeledContainer',
    'div[role="checkbox"]',
    'input[type="checkbox"]',
    'label[for*="checkbox"]',
    '.freebirdFormviewerComponentsQuestionCheckboxRoot label'
  ];
  
  for (const selector of checkboxSelectors) {
    const elements = document.querySelectorAll(selector);
    elements.forEach(element => {
      if (element && !element.classList.contains('auto-clicked')) {
        element.click();
        element.classList.add('auto-clicked'); // 重複クリック防止
      }
    });
  }

  // 名前入力欄に自動入力（複数パターンに対応）
  const inputSelectors = [
    'input.whsOnd.zHQkBf',
    'input[type="text"]',
    'input[type="email"]',
    'textarea',
    '.freebirdFormviewerComponentsQuestionTextRoot input',
    '[jsname="YPqjbf"]',
    'input[aria-label*="名前"]',
    'input[aria-label*="氏名"]',
    'input[placeholder*="名前"]'
  ];
  
  // ストレージから保存された名前を取得
  chrome.storage.sync.get(['userName'], (result) => {
    const userName = result.userName || '山田太郎'; // デフォルト名
    
    for (const selector of inputSelectors) {
      const elements = document.querySelectorAll(selector);
      elements.forEach(input => {
        if (input && !input.value && !input.classList.contains('auto-filled')) {
          input.value = userName;
          input.classList.add('auto-filled'); // 重複入力防止
          
          // 各種イベントを発火してGoogleフォームに認識させる
          input.dispatchEvent(new Event('input', { bubbles: true }));
          input.dispatchEvent(new Event('change', { bubbles: true }));
          input.dispatchEvent(new Event('blur', { bubbles: true }));
        }
      });
    }
    
    console.log('Googleフォーム自動入力完了 - 使用した名前:', userName);
  });
})();
