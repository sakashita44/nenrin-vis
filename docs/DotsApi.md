# Dots API (Draft)

このドキュメントは Event Dots (点) の扱いを, Core から分離して固定するための仕様メモ.

狙い.

* `@nenrin/core` は ridge anchors までを責務とし, dots の仕様変更が Core API を破壊しないようにする
* dots の配置ルールは外部注入できるようにする
* 点をクリック/ホバーして `metadata` を参照できるようにする

関連ドキュメント.

* `docs/concepts.md`
* `docs/CoreApi.md`
* `docs/GeometryApi.md`
* `docs/ErrorPolicy.md`

## Scope

このドキュメントで定義する想定パッケージ.

* `@nenrin/dots` (仮)

`@nenrin/dots` の責務.

* 入力 `events` と Core 出力 `ridges` から, dots の配置(モデル座標)を決定する
* dot と event の対応を保持し, hit test 結果から `metadata` を参照できる状態を作る
* 配置アルゴリズムは外部注入可能とする
* Knots (節) を特別な dot(marker)として扱い, 必要なら別リストとして出力する

Non-goals.

* Canvas/DOM/React への依存
* 画面座標(y軸下向き等), `innerRadius`, zoom/pan
* クリック判定そのもの(ピクセル距離の hit test)の実装
* Macro/Micro で knots を表示するかどうかの方針決定

## Stability policy

このドキュメントに記載した公開APIは, パッケージのroot exportから利用する前提で安定化する.
deep importは非保証とする.

安定範囲.

* Stable
    * `buildDots(ctx, algorithm, options)` のシグネチャと戻り型
    * 公開型
        * `DotPlacementContext`, `DotPlacementAlgorithm`, `DotsOptions`
        * `NenrinDot`, `NenrinKnot`, `DotsOutput`
    * `eventIndex` による `events[]` 参照の意味論
    * 決定性(同一入力なら同一dots)の要件

SemVer運用.

* Stableの破壊的変更はmajor.
* Stableに対する後方互換な追加はminor.

## Error policy

不正入力やアルゴリズム失敗は `Error` を throw する.

エラー識別は `code` を推奨する.
詳細は `docs/ErrorPolicy.md` を参照.

## Design choices

### Event identity

点をクリックして `metadata` を出すため, dot は元 event と対応付いている必要がある.

一意IDの入力は必須にしない.

* 最小運用: `events` 配列の index を event の identity として扱う
* 決定性の前提: 同一入力(同一順序の `events`)なら同一 dots になる

将来, 外部データソースの都合で「順序が揺れる」問題が出た場合のみ, 追加フィールド(例: `eventKey`)を検討する.

### Determinism policy

決定性は用途により段階を分けて扱う.

* 必須: 同一入力なら同一 dots
    * ズーム/パン/再描画で点が揺れない
* 任意: データの追加/削除があっても, 影響が局所的になる
    * 例: ある `(stepIndex, domainId)` の bucket が変わっても, 他 bucket の点は変わらない

重要.

* `eventIndex` だけを identity にすると, `events` 配列の途中に挿入/削除が起きた場合, index がずれて同じ event でも seed が変わる
* その場合, "画面が揺れる" のは原理的に避けられない
* 追加/削除時も「同じ event は同じ位置に置きたい」なら, 外部から安定なキーが必要
    * ただしキーの一意性チェックは必須にしない(重複は許容し, bucket 内の出現回数で区別する)

## Terms

このドキュメントで使う用語は `docs/CoreApi.md` と揃える.

* `ridge(t)` は step `t` の外周境界. 数式上の $R(\theta, t)$ に対応する
* `band(t)` は `ridge(t-1)` と `ridge(t)` に挟まれた領域
* 入力 `event.stepIndex = t` は `band(t)` に属する event を意味する
* dot の代表半径は常に `band(t)` の中心 $\frac{R(\theta, t-1)+R(\theta, t)}{2}$ を使い, jitter は band 内に clamp する

## Types

```ts
export interface Event {
  stepIndex: number;
  domainId: string;
  weight?: number;
  metadata?: unknown;

  // Optional stable key for dot determinism across data changes.
  // If provided, dots can remain stable even when events array order changes.
  // Uniqueness is not required.
  eventKey?: string;

  // Optional flag to treat this event as a Knot (special marker).
  // The decision of what becomes a knot is out of scope of @nenrin/dots.
  isKnot?: boolean;
}

export interface PolarAnchor {
  domainId: string;
  thetaRad: number;
  r: number;
}

export interface Ridge {
  stepIndex: number;
  anchors: PolarAnchor[];
}

export interface DotPolar {
  thetaRad: number;
  r: number;
}

export interface DotXy {
  x: number;
  y: number;
}

export interface NenrinDot {
  stepIndex: number;
  domainId: string;

  // Reference to input events.
  eventIndex: number;

  // Model coordinate.
  position: DotPolar | DotXy;
}

export interface NenrinKnot {
  stepIndex: number;
  domainId: string;

  // Reference to input events.
  eventIndex: number;

  // Model coordinate.
  position: DotPolar | DotXy;
}

export interface DotsOutput {
  dots: NenrinDot[];

  // Optional knot markers.
  // Renderer decides whether to show knots in Macro and/or Micro.
  knots?: NenrinKnot[];
}
```

## Dot placement algorithm injection

配置アルゴリズムは注入する.

```ts
export interface DotPlacementContext {
  // Original input events.
  events: Event[];

  // Core output ridges.
  ridges: Ridge[];

  // Canonical domain order/angles.
  domainIds: string[];
  domainAnglesRad: number[];
}

export interface DotPlacementAlgorithm {
  name: string;

  // Return dots in model coordinates.
  // Deterministic for the same context.
  buildDots(ctx: DotPlacementContext): NenrinDot[];
}

export interface DotsOptions {
  output: "polar" | "xy";

  // Minimum padding from band boundaries in core-r units.
  // If undefined, algorithm decides.
  bandPaddingR?: number;
}

export function buildDots(
  ctx: DotPlacementContext,
  algorithm: DotPlacementAlgorithm,
  options: DotsOptions
): DotsOutput;
```

## Default algorithm (proposal)

最初はベースラインを用意する.

* 名前: `band-jitter`
* 目標: band の内側に dots を置き, 見た目が単調にならないように微小 jitter を入れる

配置ルール(提案).

* 1 event = 1 dot
* event の属する band は step `t = event.stepIndex`
* 半径方向の基準は `band(t)` の中心 $\frac{R(t-1)+R(t)}{2}$ とし, `R(t-1)` と `R(t)` の間に収まるように jitter + clamp する
    * `t = 0` の内側境界は暗黙に `R(-1) = 0` として扱う
* 角度方向は `domain.angleRad` を中心に, 隣接 domain 角度の安全範囲内で微小にずらす

決定性(提案).

* dot の jitter は決定論に生成する
    * `event.eventKey` があればそれを優先して seed に使う
    * 無ければ `eventIndex` を seed に使う(ズーム/パン/再描画で揺れない)
* seed は bucket `(stepIndex, domainId)` の内側だけで完結させる
    * ある bucket の追加/削除が, 他 bucket の点へ波及しない

## Renderer responsibilities

Renderer 側の責務.

* dots のモデル座標を画面座標へ変換する
* ピクセル距離による hit test を行い, `eventIndex` から `events[eventIndex].metadata` を参照して表示する
* Micro 表示の幾何条件判定(`minDotSpacingPx` 等)を行う
* knots を表示するかどうか, 表示する場合の間引きや優先順位付けを決める
