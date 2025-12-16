# Development Roadmap

## Strategy

当初は個人サイトでの利用 (Notion連携) を主目的としつつ, コアロジックを汎用ライブラリとして分離可能な設計 (Monorepo構成) で開発を進める.

## Phase 1: PoC & Personal Integration (2025 Q1)

自分のWebサイト上で, Notionの日記データを可視化するビューワーを実装する.

### Step 1.1: Core Logic Implementation

* 言語: TypeScript
* 目標: 汎用的な時系列データを入力し, 描画用の座標データ (骨格パス, 点座標) を出力する計算モジュール `nenrin-core` の作成
* 技術: `d3-shape` (Spline), `poisson-disk-sampling`

### Step 1.2: Renderer Implementation

* 目標: Coreの出力データを HTML5 Canvas 上に描画する React コンポーネントの作成
* 方針: まずは静止画としての描画品質 (有機的な見た目) を確立

### Step 1.3: Notion API Integration

* 目標: Next.js (App Router) 上で Notion API を叩き, 日記データベースを `nenrin-core` 形式に変換するMapperを実装
* 到達状態: 自身のサイトで「自分の年輪」が表示される状態

## Phase 2: Polishing & Interaction (2025 Q2)

「作品」としての完成度を高め, インタラクションを実装する.

### Step 2.1: Semantic Zooming (LOD)

* 目標: ズームレベルに応じた表示切り替え (Texture $\leftrightarrow$ Bubbles $\leftrightarrow$ Particles) の実装
* 追加: Canvas上のマウスイベント処理の最適化

### Step 2.2: Generative Animation

* 目標: ロード時に中心から年輪が成長していく生成アニメーションの実装

### Step 2.3: UI/UX Refinement

* 目標: 期間フィルタリング, カテゴリごとのOn/Off機能の実装

## Phase 3: Service & Library Public Release (Future)

汎用ツールとして公開する.

### Step 3.1: Service Beta (SaaS-lite)

* 目標: "Visualize your life density" としてサービス化
* 対応: NextAuth.js 等を用いた認証, Notion以外のデータソース (GitHub, Google Calendar等) への対応
* 追加: ユーザーが自分のデータをアップロードして可視化できるPlaygroundの提供

### Step 3.2: Library Publish

* 目標: `nenrin-core` および `react-nenrin` (仮) を npm パッケージとして公開
* 追加: 開発者向けドキュメントの整備

## Recommended Architecture (Monorepo)

```text
root/
├── apps/
│   ├── personal-site/  (Next.js: 自身のサイト + Notion API連携)
│   └── web-service/    (Next.js: 将来の日記/可視化サービス)
└── packages/
    ├── core/           (TypeScript: 計算ロジック. 依存はD3.js等のみ)
    └── renderer/       (React: Canvas描画コンポーネント)
```
