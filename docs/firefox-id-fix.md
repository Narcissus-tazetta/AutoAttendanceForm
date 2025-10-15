# Firefox 拡張機能 ID 修正ガイド

## 🚨 ID フォーマットエラーの解決

### 問題のあった ID

```
auto-attendance-form-narcissus@tazetta.dev
```

### 修正した ID

```
auto-attendance-form@narcissus-tazetta.github.io
```

## 📋 Firefox で有効な ID 形式

### 1. メールアドレス形式（推奨）

```
^[a-zA-Z0-9-._]*@[a-zA-Z0-9-._]+$
```

**例**:

-   `my-extension@domain.com`
-   `auto-attendance-form@narcissus-tazetta.github.io`

### 2. UUID 形式

```
^\{[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}\}$
```

**例**:

-   `{12345678-abcd-1234-5678-123456789abc}`

## 🔧 修正のポイント

### ❌ 無効な文字・形式

-   ハイフンが @ より前に複数連続: `extension-name-user@domain`
-   無効なドメイン形式: `@tazetta.dev` (短すぎる)
-   特殊文字の不正使用

### ✅ 有効な修正

-   GitHub Pages ドメイン使用: `@narcissus-tazetta.github.io`
-   英数字・ハイフン・ピリオドのみ
-   適切なドメイン形式

## 🔄 代替 ID 案（必要に応じて）

もし現在の ID でも問題がある場合:

### UUID 形式

```json
{
    "id": "{a1b2c3d4-e5f6-7890-abcd-ef1234567890}"
}
```

### シンプルなメール形式

```json
{
    "id": "autoattendance@github.io"
}
```

## ✅ 検証方法

1. **web-ext build** - 基本的な検証
2. **about:debugging** - Firefox での実際の読み込みテスト
3. **AMO validator** - 公開前の最終チェック
