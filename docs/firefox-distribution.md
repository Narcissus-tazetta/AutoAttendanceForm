# Firefox 拡張機能の配布・署名・公開ガイド

## 🛠️ 開発フロー

### ローカル開発・テスト

```bash
# ビルド + Firefox で自動起動
bun run dev:firefox

# 手動でFirefoxにロード
bun run build:firefox
# → about:debugging で dist/firefox/manifest.json を読み込み
```

### 配布用パッケージ作成

```bash
# 未署名版（開発・テスト用）
bun run package:firefox

# 署名版（本番配布用）
bun run sign:firefox
```

## 🔐 署名（Signing）

### 前提条件

1. [AMO Developer Account](https://addons.mozilla.org/developers/) 作成
2. API キーの取得：
    - AMO Developer Hub → Manage API keys
    - `JWT issuer` と `JWT secret` をメモ

### 環境変数設定

```bash
# .env または環境変数
export WEB_EXT_API_KEY="your_jwt_issuer"
export WEB_EXT_API_SECRET="your_jwt_secret"
```

### 署名の実行

```bash
# ローカル署名
bun run sign:firefox

# CI/CD での署名（GitHub Actions）
# secrets: AMO_JWT_ISSUER, AMO_JWT_SECRET を設定
```

## 📦 配布方法

### 1. 自己配布（Self-distribution）

-   署名済み `.xpi` ファイルを直接配布
-   GitHub Releases で公開
-   企業内配布など

### 2. AMO 公開（AMO publication）

-   [AMO Developer Hub](https://addons.mozilla.org/developers/) でアップロード
-   レビュー後に公開
-   Firefox Add-ons ストアに掲載

## 🚀 リリースフロー

### 手動リリース

```bash
# 1. バージョンタグ作成
git tag v1.0.0
git push origin v1.0.0

# 2. GitHub Actions が自動実行
# → ビルド → 署名 → GitHub Releases 作成
```

### 自動リリース（GitHub Actions）

1. タグ push で自動実行
2. Chrome/Firefox 両方をビルド
3. Firefox 拡張を自動署名
4. GitHub Releases に成果物をアップロード

## 🔍 トラブルシューティング

### よくある問題

**Q: 署名に失敗する**

```
Error: Authentication failed
```

A: API キーが正しく設定されているか確認

**Q: manifest.json エラー**

```
Error: Manifest validation failed
```

A: Firefox 固有の manifest 要件を確認

-   `applications.gecko.id` の設定
-   `background.scripts` vs `background.service_worker`

**Q: web-ext run で Firefox が起動しない**

```
Error: ENOENT: no such file or directory, spawn firefox
```

A: Firefox のパスを指定

```bash
FIREFOX_PATH=/Applications/Firefox.app/Contents/MacOS/firefox bun run dev:firefox
```

## 📚 参考リンク

-   [web-ext Documentation](https://extensionworkshop.com/documentation/develop/web-ext-command-reference/)
-   [Firefox Extension Publishing](https://extensionworkshop.com/documentation/publish/)
-   [AMO Review Guidelines](https://extensionworkshop.com/documentation/publish/add-on-policies/)
-   [Manifest V2/V3 Migration](https://extensionworkshop.com/documentation/develop/manifest-v3-migration-guide/)
