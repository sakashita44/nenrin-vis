# セットアップ

このリポジトリはライブラリ優先で進める.

* 目標: TypeScriptライブラリとして `@nenrin/core` と `@nenrin/geometry` をビルドして公開する
* 非目標: 個人用のデータ取得や日記サービスをこのリポジトリへ同梱しない

## 前提

* Node.js (LTS)
* Corepack

`node` と `pnpm` が PATH に通っている環境を前提とする.

## Corepack経由でpnpm (global install不要)

Corepackを有効化してpnpmをactivateする.

```sh
corepack enable
corepack prepare pnpm@latest --activate
pnpm -v
```

## 依存関係のインストール

リポジトリrootで実行する.

```sh
pnpm install
```

## よく使うコマンド

scaffold追加後, 実際のscriptは `package.json` に置く.

典型例.

```sh
pnpm test
pnpm build
```

## ビルド方針(推奨)

TypeScript library として配布する前提で, 次を推奨する.

* ビルドツール: `tsup`
* 出力: ESM + CJS + 型定義(`.d.ts`) + sourcemap
* 公開: `package.json` の `exports` で entry を固定し, deep import を避ける
* ランタイム依存: `@nenrin/core` と `@nenrin/geometry` は依存0を維持する
* 曲線補間: `@nenrin/geometry` はアルゴリズム外部注入を前提とし, `d3-shape` 等に依存する実装は別パッケージ(例: `@nenrin/geometry-algorithms-d3`)へ分離する
