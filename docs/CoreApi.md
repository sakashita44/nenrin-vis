# Core API (Draft)

このドキュメントは `@nenrin/core` の API を固定するための仕様メモ. 実装へ移れる状態を作るのが目的.

関連ドキュメント.

* `docs/concepts.md`
* `docs/roadmap.md`
* `docs/GeometryApi.md`

## Scope

`@nenrin/core` の責務は, `(stepIndex, domainId, weight)` の集合から描画用の幾何データを生成すること.

* 入力の離散化(タイムゾーン, 日/週/月区切り)は扱わない
* Canvas, DOM, React に依存しない
* 曲線補間やサンプリングは扱わない(中間レイヤへ分離)
* ランタイム依存は0を維持する(集計とanchors生成に専念する)

## Non-goals

* Notion API やデータ取得
* UI, LOD 判定, マウスイベント処理
* 色やラベルの見た目
* Event Dots (点) の出力仕様は別途検討 (現状の Core API には含めない)

## Terms

* **step**: 離散時間インデックス `stepIndex` の1単位
* **domain**: 活動ジャンル. `domainId` で識別し, `angleRad` を持つ
* **ridge**: 各 step `t` の外周境界線(閉曲線). 数式上の $R(\theta, t)$ に対応する
* **band**: step `t` に属する領域. `ridge(t-1)` と `ridge(t)` に挟まれた領域
* **band center**: `band(t)` の代表半径. $\frac{R(\theta, t-1)+R(\theta, t)}{2}$

## Input

### TypeScript types

```ts
export interface NenrinConfig {
  vmin: number;
  growthPerActivity: number; // aka α
  domains: Domain[];
}

export interface Domain {
  id: string;
  label: string;
  angleRad: number;
}

export interface Event {
  // step `t`.
  // event is interpreted as belonging to `band(t)`, the area between `ridge(t-1)` and `ridge(t)`.
  stepIndex: number;
  domainId: string;
  weight?: number;
  metadata?: unknown;

  // Optional stable key for determinism across data changes.
  // Core accepts this field but must ignore it.
  eventKey?: string;
}

export interface NenrinInput {
  config: NenrinConfig;
  events: Event[];
}
```

### Constraints

* `events.length >= 1`
* `config.domains.length >= 3`
* `vmin` は有限(`Number.isFinite`)かつ `vmin > 0`
* `growthPerActivity` は有限(`Number.isFinite`)かつ `growthPerActivity >= 0`
* `stepIndex` は整数
* `stepIndex` は非負(`stepIndex >= 0`)
* `stepIndex` は `0..N` を前提とする
* `domainId` は `config.domains[].id` のいずれか
* `config.domains[].id` は重複禁止
* `angleRad` は入力で与える(自動配置しない)
* `angleRad` は有限(`Number.isFinite`)である必要がある
* `weight` は未指定なら `1`
* `weight` は有限(`Number.isFinite`)かつ非負

`angleRad` は任意の実数を許容するが, Core は内部的に $2\pi$ 周期で正規化して扱う(順序付け, 重複判定のため).

正規化(提案).

* `tau = 2 * Math.PI`
* `thetaNorm = ((theta % tau) + tau) % tau`

実装は変更し得るが, Core の出力順序と重複判定は「正規化した角度」に基づく.

### Validation policy

不正入力は `Error` を throw する.

方針.

* Core は「入力がクリーンである」前提で計算へ入るため, 計算前に入力を全て検証して弾く
* Core はクリーンな入力から, クリーン(非有限値を含まない)な出力を返すのを目標にする

* 例: `events.length === 0`
* 例: 未定義 `domainId`
* 例: `weight` が `NaN`, `Infinity`, 負

## Stepの意味論

Core は `stepIndex` を離散的なタイムラインとして扱う.

* `stepCount = maxStepIndex + 1`
* Core は step `t` にイベントが無くても `t = 0..maxStepIndex` の全stepを計算する
* イベントが無いstepでも, 全domainが `vmin` により成長する
* 入力 `events[].stepIndex = t` は, `band(t)` に属する event として解釈する

初期半径.

* 実装上は $R(\theta, -1)=0$ とし, step `0` の更新で `vmin + growthPerActivity * A(θ,0)` が初期値になる想定

band の内側境界.

* Core は `stepIndex = -1` の ridge を出力しない
* そのため, `t = 0` の band を構成する場合, 内側境界は暗黙に $R(\theta, -1)=0$ を使う
    * 例: dots を band の中心へ置く場合, `t = 0` は $\frac{R(\theta,-1)+R(\theta,0)}{2} = \frac{R(\theta,0)}{2}$ を代表半径として良い

つまり, 入力eventsはstep欠損を許容するが, 出力ridgesは常に連続したstepを含む.

## Output

### Design goals

* Renderer が Canvas/SVG どちらでも描画できる形
* 再現性が高い(同一入力で同一出力)
* LOD に応じて必要な部分だけ使える
* 補間アルゴリズムを試行錯誤しても API が揺れない

### Output types (draft)

```ts
export interface NenrinCoreOutput {
  stepCount: number;
  domainCount: number;

  // Canonical domain order used by matrices.
  // This order is deterministic and independent from input domains array order.
  domainIds: string[];
  domainAnglesRad: number[];

  // Ridge geometry for each step
  ridges: Ridge[];

  // Optional: per-step aggregated activity sum, useful for debug/analysis
  activitySumByStepDomain?: number[][]; // [t][domainIndex]

  // Optional: dictionary style access by domainId.
  // Intended for debug/analysis and beginners who prefer key-based lookup.
  // Each array length is stepCount.
  activitySumSeriesByDomainId?: Record<string, number[]>; // [domainId][t]
}

export interface Ridge {
  stepIndex: number;

  anchors: PolarAnchor[];
}

export interface PolarAnchor {
  domainId: string;
  thetaRad: number;
  r: number;
}

export interface NenrinCoreApi {
  computeNenrinCore(input: NenrinInput, options?: NenrinCoreOptions): NenrinCoreOutput;
}
```

`domainIds` と `domainAnglesRad` は同じ長さで, `domainIndex` はこの配列のインデックス.

`domainAnglesRad` と `anchors[].thetaRad` は $[0, 2\pi)$ に正規化済みの角度を返す.

`activitySumByStepDomain[t][domainIndex]` の `domainIndex` は `domainIds[domainIndex]` を参照する.

`activitySumSeriesByDomainId[domainId][t]` は同じ情報を辞書形式で参照するためのもの.

`ridges[].anchors[]` は `thetaRad` 昇順で返す. この順序は `domainIds` と一致させる.

anchors の形状保証.

* 各 `ridges[t].anchors` は必ず `domainCount` 個を返す
* `anchors` は domain 欠損を作らない
    * event が無い domain でも `vmin` により成長するため, `r` は常に定義できる
* `anchors[i].domainId === domainIds[i]` を満たす
* `anchors[i].thetaRad === domainAnglesRad[i]` を満たす

### Ridge representation decision

Core は domain-angle anchors のみを返す.

* Core は `anchors` を必ず返す
* 曲線補間やサンプリングは Core の責務外
* `anchors` を closed curve として補間するのは中間レイヤ(geometry)か Renderer の責務

## Core options

Core API は `computeNenrinCore(input, options)` のような形を想定する.

```ts
export interface NenrinCoreOptions {
  // Optional validation for domain angle proximity.
  // If undefined, default value is applied.
  minDomainAngleSeparationRad?: number;

  // Whether to include activitySumByStepDomain in the output.
  includeActivitySumMatrix?: boolean; // default: false

  // Whether to include activitySumSeriesByDomainId in the output.
  includeActivitySumSeriesByDomainId?: boolean; // default: false
}

```

運用方針.

* 通常運用では, `minDomainAngleSeparationRad` を正の値で指定するのが安全
* 推奨デフォルトは `0.05` rad
    * `options` 未指定, または `minDomainAngleSeparationRad` 未指定の場合, Core は `0.05` rad を採用する
        * つまり, 角度近接チェックはデフォルトで有効
* `minDomainAngleSeparationRad = 0` の場合, 近接チェックは無効化する(正規化後の重複角度のみを弾く)

`0.05` rad 未満を使う場合, 利用側が明示的に設定する.

options の検証.

* `minDomainAngleSeparationRad` は有限(`Number.isFinite`)かつ `>= 0` を要求する. 違反は `Error`
* `domainCount * minDomainAngleSeparationRad > 2 * Math.PI` の場合, 角度分離が原理的に不可能なので `Error` として良い

既定値のメモ.

* `minDomainAngleSeparationRadDefault = 0.05`

## Public API shape

公開APIは次で固定する.

```ts
export function computeNenrinCore(
  input: NenrinInput,
  options?: NenrinCoreOptions
): NenrinCoreOutput;
```

### Parameter semantics

* `vmin` の適用範囲
    * `vmin` は全 domain に対して毎 step 適用する
    * event が無い step でも成長する(時間の層が完全に消えない)

* `growthPerActivity` (aka $\alpha$)
    * `weight` の集計値を半径増分へ換算する成長係数

## Sampling policy

Core は角度方向を入力 `domains[].angleRad` に依存させる.

* `domains[].angleRad` は API で入力必須
* 角度の近接度は入力側の設計意図になり得るため, Core は自動配置しない
* バリデーションとして, 同一角度(重複)は `Error` 扱いにするのが安全
* 近接度チェックは `minDomainAngleSeparationRad` を用いて行う
    * 未指定の場合, デフォルト(`0.05` rad)を適用する
        * `0` の場合, 近接チェックを無効化する

近接判定(提案).

* `angleRad` を $2\pi$ 周期で正規化し, `thetaNorm` 昇順にソートする
* 隣接差分 `delta[i] = theta[i+1] - theta[i]` と, wrap 差分 `deltaWrap = (theta[0] + 2\pi) - theta[last]` を計算する
* 最小差分が `minDomainAngleSeparationRad` 未満なら `Error`

順序ポリシー.

* Core は `config.domains` の入力順序を意味論として扱わない
* 出力 `anchors` の順序は `thetaRad` 昇順(正規化後)で固定する
* 同一 `thetaRad`(正規化後)は `Error` とする

## Curve / interpolation

現状の方針は「閉曲線が滑らかで, 0 と $2\pi$ で継ぎ目が出ない」こと.

補間アルゴリズムは Core では固定しない.

* PoC は試行錯誤しながら決定して良い
* Core の安定 API は `anchors` のみとし, 補間の変更が Core 出力型の変更を誘発しないようにする

推奨.

* `@nenrin/geometry` (仮) を用意し, `anchors` を補間して描画用の点列へ変換する責務を分離する

## Determinism

Core 出力は入力が同一なら同一にする.

* 同一入力でも順序が変わると結果が変わるのは避けたい

決定性ルール.

* `events` の順序は出力へ影響しない
    * Core は `(stepIndex, domainId)` 単位で集計し, 集計結果だけを使う
* `events[].metadata` と `events[].eventKey` は Core 出力へ影響しない
    * Core は `metadata` と `eventKey` を参照しない
* `anchors` の順序は固定
    * `anchors` は `thetaRad` 昇順(正規化後)で返す
    * `config.domains` の入力順序は出力へ影響しない
    * `domainCount = config.domains.length`

`activitySumByStepDomain` を含める場合, `[t][domainIndex]` の `domainIndex` は `domainIds` の順序と一致させる.

## Error cases

次は `Error` を throw する.

* `events.length === 0`
* `config.domains.length === 0`
* `config.domains.length < 3`
* `vmin` が非有限, または `vmin <= 0`
* `growthPerActivity` が非有限, または `growthPerActivity < 0`
* `config.domains[].id` の重複
* `stepIndex` が整数でない
* `stepIndex < 0`
* `domainId` が `config.domains[].id` に存在しない
* `angleRad` が非有限(`NaN`, `Infinity`)
* `weight` が非有限, または負
* `thetaRad` 正規化後の重複(同一角度). 判定は `===` で良い

`minDomainAngleSeparationRad` が指定された場合, 角度近接の違反も `Error` として良い.

## Notes for renderer

Renderer 側で扱う想定.

* Geometry レイヤ(`nenrin-geometry`)を使い, `anchors` を点列へ変換
* Geometry レイヤ(`@nenrin/geometry`)を使い, `anchors` を点列へ変換
* `innerRadius` の導入
* Micro の点座標の微小オフセット
* seed の生成(決定論)

## Open questions

* PoC の curve は何を採用するか(geometryレイヤの責務)
* 角度近接バリデーション(`minDomainAngleSeparationRad`)の既定値を `0.05` rad とする
