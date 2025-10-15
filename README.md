# Auto Attendance Form Extension

Google フォームの出席フォームを自動で入力・送信し、送信後はタブも自動で閉じるブラウザ拡張機能です。Chrome と Firefox の両方に対応しています。

# 自動出席フォーム (Auto Attendance Form)

## 目的

Google フォームの出席フォームを自動で入力・送信するブラウザ拡張機能（Chrome / Firefox 対応）をビルド・配布するためのソースとスクリプトが含まれています。

## 技術スタック（現状ファイルに基づく）

-   TypeScript
-   React
-   Tailwind CSS
-   esbuild
-   webextension-polyfill
-   bun (スクリプト実行に利用している)

## 主要ファイル・ディレクトリ（現状）

-   `src/` - 拡張機能のソース（content, popup, background 等）
-   `scripts/` - ビルド補助スクリプト（`build.js`, `convert-fonts.js`, `clean.js` など）
-   `dist/` - ビルド出力（`dist/chrome`, `dist/firefox` が生成される）
-   `build/` - 配布用アーカイブや生成成果物が置かれる（zip や署名済 xpi など）
-   `manifest.common.json`, `manifest.chrome.json`, `manifest.firefox.json` - マニフェストの元データ
-   `package.json`, `bun.lock` - スクリプト定義・ロックファイル

## 使えるコマンド（現状の `package.json` に基づく）

-   `bun install` - 依存インストール
-   `bun run build:css` - Tailwind CSS のビルド
-   `node scripts/convert-fonts.js` - フォント変換（TTF → WOFF2）
-   `bun run build:chrome` - Chrome 用ビルドと zip 生成（`dist/chrome` → `build/*.zip`）
-   `bun run build:firefox` - Firefox 用ビルドと zip 生成（`dist/firefox` → `build/*.zip`）
-   `bun run build:all` - 上記をまとめて実行
-   `bun run clean:build` - `scripts/clean.js` を実行して生成物を削除
-   `bun run clean:all` - `clean:build` に加えて node_modules 等の削除を行う（`package.json` の定義に依存）
-   `web-ext sign --source-dir=dist/firefox --artifacts-dir=build/signed` - Firefox 署名（`web-ext` による）

## 生成物の場所（現状）

-   `dist/chrome` - Chrome 用の展開フォルダ（`popup.js`, `background.js`, `manifest.json`, など）
-   `dist/firefox` - Firefox 用の展開フォルダ
-   `build/` - ZIP や署名済 XPI（`build/signed/` 配下に署名済 xpi を置く想定）

## Firefox の署名に関する事実

-   リリース版の Firefox では署名済みの XPI が必要で、未署名の XPI/zip は拒否される（about:addons のメッセージが出る）。
-   署名は `web-ext sign` を利用して行うことが想定されている（AMO の Developer アカウント / API キーが必要になる場合がある）。

## マニフェスト生成の挙動（現状 `scripts/build.js` のロジック）

-   `manifest.common.json` を読み込み、`manifest.chrome.json` / `manifest.firefox.json` の差分を上書きしてマージする
-   Chrome 向けビルドでは `applications` や `browser_specific_settings` を削除して出力する処理がある
-   Firefox 向けビルドでは `background.service_worker` があれば `background.scripts` に変換する処理が追加されている

## デバッグに関する事実

-   コンテンツスクリプトのログはページの DevTools コンソールに出力される
-   バックグラウンドスクリプトは拡張機能のデバッグページ（about:debugging 等）で確認できる
-   ポップアップの DevTools はポップアップを開いて検証できる

## クリーンアップに関する事実

-   `scripts/clean.js` が存在し、`bun run clean:build` で `dist/` の再作成や `.DS_Store` の削除、`build/` 内の成果物削除を行う

## ライセンス（現状ファイル）

-   `LICENSE` ファイルが存在し、MIT ライセンスが置かれている

---

以上はリポジトリ内の現状ファイルとスクリプトに基づく事実の列挙です。

## トラブルシュート

-   Firefox で "This add-on could not be installed because it has not been verified." → 署名済 XPI を使うか、一時的なアドオンでテストしてください。
-   `web-ext sign` で認証エラー → AMO の API キーが正しく設定されているか確認してください。
-   `tailwindcss` の警告で `caniuse-lite` 更新を促されたら `npx update-browserslist-db@latest` を実行してください。

## 貢献

プルリク歓迎です。CI（予定）でビルドが成功することを確認してからマージしてください。

## ライセンス

MIT - 詳細は `LICENSE` を参照

---

ドキュメントは随時更新しています。問題や改善案があれば Issue を作成してください。

##　※この文章は AI によって生成されました
