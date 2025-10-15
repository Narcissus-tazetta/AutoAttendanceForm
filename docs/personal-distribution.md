# 個人配布用 Firefox 拡張機能ガイド

## 🚀 AMO Account 不要の配布方法

### 方法 1: GitHub Releases での未署名配布

#### 配布者側（あなた）

```bash
# ビルド
bun run build:firefox

# パッケージ作成
bun run package:firefox

# GitHub Releases にアップロード（手動 or Actions）
```

#### 利用者側

1. GitHub Releases から `自動出席フォーム firefox.zip` をダウンロード
2. 展開してフォルダを取得
3. Firefox で `about:debugging` を開く
4. 「この Firefox」→「一時的なアドオン」
5. `manifest.json` を選択

**制限**: Firefox 再起動で無効化される

### 方法 2: 開発者モード常用（上級者向け）

#### 利用者が行う設定

```
about:config → xpinstall.signatures.required → false
```

これにより未署名アドオンも永続的に動作

**注意**: セキュリティリスクがあるため推奨されない

### 方法 3: ユーザースクリプト化

```javascript
// Tampermonkey / Greasemonkey用
// @name         自動出席フォーム
// @match        https://docs.google.com/forms/*
```

ブラウザ拡張ではなくユーザースクリプトとして配布

## 🔄 段階的アプローチ（推奨）

### Step 1: まず未署名版で個人配布

-   GitHub Releases で zip 配布
-   利用者には「一時的なアドオン」での読み込み方法を説明
-   フィードバック収集・改善

### Step 2: 需要があれば AMO Account 作成

-   利用者から「毎回読み込むのが面倒」という声があれば
-   AMO Developer Account 作成 → 署名版配布

### Step 3: さらに需要があれば AMO 公開

-   より多くの人に使ってもらいたい場合
-   Mozilla の審査を通過して公式ストア掲載
