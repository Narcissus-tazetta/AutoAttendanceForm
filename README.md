# Auto Attendance Form Extension

Google フォームの出席フォームを自動で入力・送信し、送信後はタブも自動で閉じるブラウザ拡張機能です。Chrome と Firefox の両方に対応しています。

## 技術スタック

-   **TypeScript** - 型安全なコード開発
-   **React 19** - モダンなポップアップ UI
-   **Tailwind CSS** - スタイリング
-   **webextension-polyfill** - クロスブラウザ対応
-   **esbuild** - 高速ビルド
-   **Bun** - パッケージ管理とタスクランナー

## プロジェクト構成

```
src/
├── content.ts          # コンテンツスクリプト（フォーム操作）
├── popup.tsx          # React ポップアップ UI
├── popup.css          # Tailwind スタイル
├── background.ts      # バックグラウンドスクリプト
├── firefox/           # Firefox 固有の実装
│   ├── background.ts  # Firefox 用バックグラウンド
│   └── tabManager.ts  # Firefox 用タブ管理
└── shared/           # 共通ユーティリティ
    └── formUtils.ts  # DOM 操作ヘルパー

scripts/
├── build.js          # メインビルドスクリプト
└── convert-fonts.js  # フォント変換（TTF → WOFF2）

manifest.common.json  # 共通マニフェスト設定
manifest.chrome.json  # Chrome 固有設定
manifest.firefox.json # Firefox 固有設定
```

## セットアップ

### 依存関係のインストール

```bash
bun install
```

### 開発ビルド

全て（フォント変換 + CSS + Chrome ビルド）:

```bash
bun run build:all
```

個別ビルド:

```bash
# Chrome 用
bun run build:chrome

# Firefox 用
bun run build:firefox

# CSS のみ
bun run build:css

# フォント変換のみ
bun run build:fonts
```

### 型チェック

```bash
bun run typecheck
```

### パッケージング

```bash
# Chrome 用 ZIP
bun run package:chrome

# Firefox 用 ZIP
bun run package:firefox
```

## インストール方法

### Chrome

1. `bun run build:chrome` でビルド
2. Chrome の拡張機能ページ（chrome://extensions/）を開く
3. 「デベロッパーモード」を有効にする
4. 「パッケージ化されていない拡張機能を読み込む」から `dist/chrome` を選択

### Firefox

1. `bun run build:firefox` でビルド
2. Firefox の about:debugging を開く
3. 「この Firefox」→「一時的なアドオン」から `dist/firefox/manifest.json` を選択

または web-ext を使用:

```bash
cd dist/firefox && npx web-ext run
```

## 主な機能

### 自動フォーム入力

-   Google フォームのタイトルに「出席フォーム」が含まれる場合のみ動作
-   チェックボックスやラベルの自動選択
-   名前欄への自動入力（ポップアップで設定）
-   送信ボタンの自動クリック（ON/OFF 切り替え可能）

### クロスブラウザ対応

-   Chrome: `chrome.*` API を直接使用
-   Firefox: `webextension-polyfill` で統一インターフェース
-   ストレージフォールバック: sync → local → background messaging

### モダンな UI

-   React + TypeScript による型安全なポップアップ
-   Tailwind CSS による洗練されたデザイン
-   Playwrite フォントによる美しいタイポグラフィ
-   アクセシブルなトグルスイッチ

### 堅牢な動作

-   DOM 要素の動的検出（MutationObserver 使用）
-   複数の送信完了検知（ページ更新・完了メッセージ・タイムアウト）
-   エラー時の自動リトライ機能
-   詳細なデバッグログ（`[AAF]` プレフィックス）

## 開発ガイド

### ログの確認

実行時ログは `[AAF]` プレフィックスで出力されます:

-   **コンテンツスクリプト**: ページの DevTools コンソール
-   **バックグラウンド**: 拡張機能のサービスワーカー
-   **ポップアップ**: ポップアップの DevTools コンソール

### ビルドシステム

-   `esbuild` による高速バンドル
-   ターゲット別出力（`dist/chrome`, `dist/firefox`）
-   自動フォント変換（TTF → WOFF2）
-   マニフェストの自動マージ

### ストレージ設計

-   `userName`: ユーザー名（文字列）
-   `autoSubmit`: 自動送信フラグ（boolean）
-   Chrome: `chrome.storage.sync` 優先
-   Firefox: `browser.storage.local` 使用

### デバッグ方法

1. ブラウザの DevTools でコンソールを開く
2. `[AAF]` でフィルタしてログを確認
3. 各ステップの実行状況を追跡

## ライセンス

MIT License - 詳細は [LICENSE](LICENSE) を参照
