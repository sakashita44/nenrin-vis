# Implementation Policy

このドキュメントは, `@nenrin/*` の実装方針をまとめる.

目的.

* 場当たり的な対応を避け, 堅牢でクリーンな実装へ誘導する
* Core/Geometry/Dots の責務境界を維持する
* 公開APIの安定化と, 試行錯誤が必要な領域の分離を両立する

## Scope

対象.

* `@nenrin/types`
* `@nenrin/core`
* `@nenrin/geometry`
* `@nenrin/dots`

対象外.

* UIやサービス統合(データ取得, React等)
* Rendererの画面文脈(zoom/pan, innerRadius, hit test)

## Repository Structure

基本方針.

* monorepoでpackages単位に分割する
* Typesは完全に依存0, type-only exportを維持する
* Core/Geometry/Dotsは Types のみに依存する
* 曲線補間など外部依存が必要な実装は別パッケージへ隔離する

推奨構成.

```text
root/
└── packages/
    ├── types/
    ├── core/
    ├── geometry/
    ├── geometry-algorithms-d3/
    ├── dots/
    └── renderer-canvas/
```

## Package Boundaries

### @nenrin/types

責務.

* パッケージ間で共有される型定義のみを提供する
* データ構造の契約(interface, type)を定義する
* 循環依存を防ぐための中立な型レイヤとして機能する

制約.

* **Type-only export**: 型, interface, type alias のみをexportする
* **値の禁止**: 関数, クラス, 定数, enumなどの値を含めない
* **ランタイムコード禁止**: 実行可能なコードを含めない. ビルド後のJSは空またはre-exportのみ
* **依存0**: 他のパッケージ(自身の`@nenrin/*`を含む)に依存しない
* **重複禁止**: 型定義を他パッケージで重複させない. 共有型は必ずこのパッケージへ集約する

非責務.

* 実装ロジック
* バリデーション関数
* 型ガード関数
* ユーティリティ関数

狙い.

* ランタイムコストがゼロの型パッケージとして提供する
* パッケージ間の循環依存を防ぐ
* Core なしで Geometry や Dots を利用できる状態を維持する

仕様参照.

* 型定義は各パッケージのAPI仕様ドキュメント(`docs/CoreApi.md`等)で意味論を定義する
* Typesは型の形状のみを提供し, 意味論はドキュメントで規定する

### @nenrin/core

責務.

* 入力 `events` を `(stepIndex, domainId)` 単位で集計する
* `vmin` と `growthPerActivity` でridgeの `anchors` を生成する
* 曲線補間やサンプリングは扱わない

非責務.

* timestamp, timezone, 日/週/月の区切り
* DOM/Canvas/SVG/WebGL
* dots

仕様参照.

* `docs/CoreApi.md`

### @nenrin/geometry

責務.

* Core出力 `anchors` を点列(polyline)へ変換する
* 曲線補間アルゴリズムを注入できる形で固定する

非責務.

* UI, 描画API, hit test
* innerRadius, zoom/pan

仕様参照.

* `docs/GeometryApi.md`

### @nenrin/dots

責務.

* `events` と Core出力を入力にdots(モデル座標)を生成する
* dotとeventを対応付け, `eventIndex` で `metadata` 参照を成立させる
* 配置アルゴリズムを注入できる形で固定する

非責務.

* ピクセル距離によるhit test
* Macro/Micro判定

仕様参照.

* `docs/DotsApi.md`

## Public API Stability

方針.

* 公開APIはパッケージのroot exportから利用する前提で安定化する
* deep importは非保証とする
* SemVerで運用する

安定範囲.

* Stable
    * 仕様に記載した関数シグネチャと公開型
    * 仕様に記載した意味論(入力制約, 順序保証, 再現性)
* Diagnostics
    * デバッグや分析用途の補助出力
    * minorで変更し得る
* Experimental
    * 試行錯誤が前提の同梱アルゴリズム等
    * minorで破壊的変更し得る

詳細.

* `docs/CoreApi.md`
* `docs/GeometryApi.md`
* `docs/DotsApi.md`

## Error Policy

方針.

* 不正入力は例外をthrowする
* 内部計算の失敗(非有限値, 退化)も例外をthrowする
* 例外の識別は `code` を安定キーとして行う
* `message` は非安定とする

詳細.

* `docs/ErrorPolicy.md`

## Validation Policy

方針.

* 計算前に入力を全検証して, 以降の計算は「入力がクリーン」という前提で書く
* validateと計算本体を分離する

推奨形.

* `validateXxx(input)`
* `computeXxxUnsafe(validatedInput)`

狙い.

* 本体ロジックに分岐を散らさない
* エラーの出し方を一貫させる

## Determinism

### Core

* 同一入力なら同一出力を返す
* `activitySumPolicy` で決定性と性能のトレードオフを提供する

### Geometry

* 同一入力なら同一点列を返す
* `ctx` はpass-throughとして扱い, Geometry自身は解釈しない

### Dots

* 同一入力なら同一dotsを返す
* seedは `eventKey` 優先, 無い場合は `eventIndex` を使う

## Dependencies

方針.

* `@nenrin/types` は完全に依存0 (他の `@nenrin/*` を含む)
* `@nenrin/core`, `@nenrin/geometry`, `@nenrin/dots` は `@nenrin/types` のみに依存
* 外部依存が必要な試行錯誤は別パッケージへ隔離する
    * 例: `@nenrin/geometry-algorithms-d3`

狙い.

* 依存地獄の回避
* 循環依存の防止
* 利用者が描画方式を自由に選べる状態の維持
* パッケージを独立して利用可能にする(例: Core なしで Geometry のみ利用)

## Build Policy

方針.

* パッケージ公開を前提に, ESM + CJS + `.d.ts` + sourcemap を出力する
* `exports` でentryを固定し, deep importを避ける

推奨ツール.

* pnpm(corepack)
* `tsup`

詳細.

* `docs/Setup.md`

## Testing Policy

方針.

* 仕様に書いた入力制約と順序保証をテストで固定する
* 決定性はpolicyごとに期待値を分ける

例.

* Core
    * `activitySumPolicy: "fast"` は入力順固定で一致を確認
    * `activitySumPolicy: "stable"` は入力順をpermuteしても不変を確認

## Implementation Anti-patterns

避ける.

* Coreへ曲線補間や描画都合の処理を混ぜる
* エラーメッセージ文字列で分岐する
* 入力不正の分岐を計算ループ内へ散らす
* アルゴリズム試行錯誤をStable APIへ直結させる
