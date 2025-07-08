// Googleフォームのタイトル取得・判定・自動入力サンプル
(function() {
  // タイトル取得
  const title = document.querySelector('.freebirdFormviewerViewHeaderTitle')?.innerText || '';
  if (!title.includes('出席')) return; // 出席フォームでなければ何もしない

  // チェックボックスやラベルの自動クリック（例: 1つ目のチェックボックス）
  const checkbox = document.querySelector('div[role="checkbox"]');
  if (checkbox) checkbox.click();

  // 名前入力欄に自動入力（例: 1つ目のテキスト入力欄）
  const nameInput = document.querySelector('input[type="text"]');
  if (nameInput) nameInput.value = '山田太郎';

  // 入力イベントを発火
  nameInput?.dispatchEvent(new Event('input', { bubbles: true }));
})();
