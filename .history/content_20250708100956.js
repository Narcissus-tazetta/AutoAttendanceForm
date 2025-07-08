// Googleフォームのタイトル取得・判定・自動入力サンプル
(function() {
  // タイトル取得（meta[itemprop="name"]のcontent属性から）
  const title = document.querySelector('meta[itemprop="name"]')?.content || '';
  if (!title.includes('出席')) return; // 出席フォームでなければ何もしない

  // チェックボックスの代わりに、特定のlabel要素（OLkl6cクラス）をクリック
  const label = document.querySelector('label.OLkl6c');
  if (label) label.click();

  // 名前入力欄に自動入力（例: 1つ目のテキスト入力欄）
  const nameInput = document.querySelector('input[type="text"]');
  if (nameInput) nameInput.value = '山田太郎';

  // 入力イベントを発火
  nameInput?.dispatchEvent(new Event('input', { bubbles: true }));
})();
