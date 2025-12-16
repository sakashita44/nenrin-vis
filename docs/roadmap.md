# Development Roadmap

## Strategy

コアロジックを汎用ライブラリとして分離可能な設計 (Monorepo構成) で開発を進める.

### Core Logic Implementation

* 言語: TypeScript
* 目標: 離散ステップ入力 (`stepIndex`) を受け取り, 描画用の座標データ (境界線/Ridge, 帯/Band) を出力する計算モジュール `@nenrin/core` の作成
* 方針: 曲線補間(d3-shape等)はCoreに入れず, geometryレイヤへ分離

### Geometry Implementation

* 目標: Core出力(`anchors`)を補間し, 描画用の曲線データへ変換する `@nenrin/geometry` の作成
* 技術候補: `@nenrin/geometry-algorithms-d3` (仮) で `d3-shape` 等を試行錯誤して決定
* 方針: 出力は `polar` / `xy` を選択式にして, 描画方式は利用者が選べる状態にする
* 依存方針: `@nenrin/geometry` 本体は依存0 + アルゴリズム外部注入を維持し, `d3-shape` 等に依存する曲線実装は別パッケージ(例: `@nenrin/geometry-algorithms-d3`)として分離する

### Dots Implementation

* 目標: `events` と Core 出力を入力に, Event Dots (点) を生成する補助パッケージ `@nenrin/dots` (仮) の作成
* 方針: 点の配置ルールは外部注入できる形にして, 試行錯誤をパッケージ外へ逃がせるようにする
* 目的: Micro 表示と `metadata` 参照(クリック/ホバー)を成立させる

### Renderer Implementation

* 目標: Core/Geometry/Dots の出力を描画して見た目を調整できる reference implementation を用意する
* 方針: core/geometry/dots は renderer に依存しない

## Service & Library Public Release

汎用ツールとして公開する.

### Library Publish

* 目標: `@nenrin/core` を npm パッケージとして公開
* 追加: 開発者向けドキュメントの整備

## Recommended Architecture (Monorepo)

このリポジトリはライブラリ優先で進められる.

* `core` と `geometry` を公開可能なpackagesとして維持する
* `apps/` や `examples/` はこのリポジトリの必須構成にしない

```text
root/
└── packages/
    ├── core/           (TypeScript: 計算ロジック. 依存0)
    ├── geometry/       (TypeScript: 曲線補間/サンプリング. 依存0 + アルゴリズム外部注入)
    ├── geometry-algorithms-d3/ (TypeScript: d3-shape等に依存する曲線アルゴリズム群)
    ├── dots/           (TypeScript: Event Dots. 依存0 + 外部注入)
    ├── renderer/       (reference implementation)
    └── ...
```
