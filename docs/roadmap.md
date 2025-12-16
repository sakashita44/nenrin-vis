# Development Roadmap

## Strategy

当初は個人サイトでの利用 (Notion連携) を主目的としつつ, コアロジックを汎用ライブラリとして分離可能な設計 (Monorepo構成) で開発を進める.

## PoC & Personal Integration

自分のWebサイト上で, Notionの日記データを可視化するビューワーを実装する.

### Core Logic Implementation

* 言語: TypeScript
* 目標: 離散ステップ入力 (`stepIndex`) を受け取り, 描画用の座標データ (境界線/Ridge, 帯/Band) を出力する計算モジュール `@nenrin/core` の作成
* 方針: 曲線補間(d3-shape等)はCoreに入れず, geometryレイヤへ分離

### Geometry Implementation

* 目標: Core出力(`anchors`)を補間し, 描画用の曲線データへ変換する `@nenrin/geometry` の作成
* 技術候補: `d3-shape` (Spline) 等を試行錯誤して決定
* 方針: 出力は `polar` / `xy` を選択式にして, 描画方式は利用者が選べる状態にする
* 依存方針: `@nenrin/geometry` 本体は依存0 + アルゴリズム外部注入を維持し, `d3-shape` 等に依存する曲線実装は別パッケージ(例: `@nenrin/geometry-algorithms-d3`)として分離する

### Dots Implementation

* 目標: `events` と Core 出力を入力に, Event Dots (点) を生成する補助パッケージ `@nenrin/dots` (仮) の作成
* 方針: 点の配置ルールは外部注入できる形にして, 試行錯誤をパッケージ外へ逃がせるようにする
* 目的: Micro 表示と `metadata` 参照(クリック/ホバー)を成立させる

### Renderer Implementation

* 目標: Coreの出力データを HTML5 Canvas 上に描画する React コンポーネントの作成
* 方針: まずは静止画としての描画品質 (境界線と帯の読みやすさ) を確立
* 位置づけ: 公式 reference implementation とし, core/geometry はこれに依存しない

### Notion API Integration

* 目標: Next.js (App Router) 上で Notion API を叩き, 日記データベースを `@nenrin/core` 形式 (離散ステップ, 1イベント=1ドメイン, `weight`) に変換するMapperを実装
* 到達状態: 自身のサイトで「自分の年輪」が表示される状態

## Polishing & Interaction

「作品」としての完成度を高め, インタラクションを実装する.

### Semantic Zooming (LOD)

* 目標: Macro/Micro の2段切り替えを実装する
    * Macro: 境界線 + 帯を表示し, 帯(step単位)を選択して詳細参照する
    * Micro: 幾何条件を満たす場合のみ点(イベント)を表示する
* 追加: Canvas上のマウスイベント処理の最適化

### Generative Animation

* 目標: ロード時に中心から年輪が成長していく生成アニメーションの実装

### UI/UX Refinement

* 目標: 期間フィルタリング, カテゴリごとのOn/Off機能の実装
* 追加: domain角度をインタラクティブに調整するeditorの検討

## Service & Library Public Release

汎用ツールとして公開する.

### Service Beta (SaaS-lite)

* 目標: "Visualize your life density" としてサービス化
* 対応: NextAuth.js 等を用いた認証, Notion以外のデータソース (GitHub, Google Calendar等) への対応
* 追加: ユーザーが自分のデータをアップロードして可視化できるPlaygroundの提供

### Library Publish

* 目標: `@nenrin/core` および `react-nenrin` (仮) を npm パッケージとして公開
* 追加: 開発者向けドキュメントの整備

## Recommended Architecture (Monorepo)

このリポジトリはライブラリ優先で進められる.

* `core` と `geometry` を公開可能なpackagesとして維持する
* 統合コード(Notion取得, personal site, diary service)は必要なら別リポジトリへ分離する
* `apps/` や `examples/` はreference実装としてのみ追加し, 必須構成にしない

```text
root/
├── apps/
│   ├── personal-site/  (Next.js: 自身のサイト + Notion API連携)
│   └── web-service/    (Next.js: 将来の日記/可視化サービス)
└── packages/
    ├── core/           (TypeScript: 計算ロジック. 依存0)
    ├── geometry/       (TypeScript: 曲線補間/サンプリング. d3-shape等)
    ├── dots/           (TypeScript: Event Dots. 依存0 + 外部注入)
    └── renderer/       (React: Canvas描画コンポーネント)
```
