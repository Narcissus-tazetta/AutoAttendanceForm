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
        // チェックボックスが既にチェック済みかどうか確認
        const checkbox = element.querySelector('[role="checkbox"]') || element;
        const isChecked = checkbox.getAttribute('aria-checked') === 'true' || 
                         checkbox.checked || 
                         checkbox.classList.contains('checked') ||
                         element.querySelector('.checked');
        
        if (!isChecked) {
          element.click();
          element.classList.add('auto-clicked'); // 重複クリック防止
        }
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
  
  // ストレージから保存された名前と自動送信設定を取得
  chrome.storage.sync.get(['userName', 'autoSubmit'], (result) => {
    const userName = result.userName || '山田太郎'; // デフォルト名
    const autoSubmit = result.autoSubmit || false; // デフォルトはfalse
    
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
    
    // 自動送信が有効な場合、送信ボタンをクリック
    if (autoSubmit) {
      const submitSelectors = [
        'div[role="button"][aria-label="Submit"]',
        'div[jsname="M2UYVd"]',
        'div.uArJ5e.UQuaGc.Y5sE8d.VkkpIf.QvWxOd',
        'span:contains("送信")',
        '[aria-label*="送信"]',
        '[aria-label*="Submit"]'
      ];
      
      for (const selector of submitSelectors) {
        const submitButton = document.querySelector(selector);
        if (submitButton && !submitButton.classList.contains('auto-submitted')) {
          setTimeout(() => {
            submitButton.click();
            submitButton.classList.add('auto-submitted');
            console.log('フォームを自動送信しました');
          }, 1000); // 1秒待ってから送信
          break;
        }
      }
    }
    
    console.log('Googleフォーム自動入力完了 - 使用した名前:', userName, '自動送信:', autoSubmit);
  });
})();
