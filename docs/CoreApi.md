# Core API (Draft)

このドキュメントは `@nenrin/core` の API を固定するための仕様メモ. 実装へ移れる状態を作るのが目的.

関連ドキュメント.

* `docs/concepts.md`
* `docs/roadmap.md`
* `docs/GeometryApi.md`
* `docs/ErrorPolicy.md`

## Scope

`@nenrin/core` の責務は, `(stepIndex, domainId, weight)` の集合から描画用の幾何データを生成すること.

* 入力の離散化(タイムゾーン, 日/週/月区切り)は扱わない
* Canvas, DOM, React に依存しない
* 曲線補間やサンプリングは扱わない(中間レイヤへ分離)
* ランタイム依存は0を維持する(集計とanchors生成に専念する)

## Stability policy

このドキュメントに記載した公開APIは, パッケージのroot exportから利用する前提で安定化する.
deep importは非保証とする.

安定範囲.

* Stable
    * `computeNenrinCore(input, options?)` のシグネチャ
    * `NenrinInput`, `NenrinConfig`, `Domain`, `Event` の意味論と入力制約
    * `NenrinCoreOutput` のうち, 描画に必須なフィールド
        * `stepCount`, `domainIds`, `domainAnglesRad`, `ridges`
        * `ridges[].anchors` の形状保証と順序保証
* Diagnostics
    * デバッグや分析用途の補助出力. 将来, minorで変更し得る
        * `activitySumByStepDomain?`
        * `activitySumSeriesByDomainId?`

SemVer運用.

* Stableの破壊的変更はmajor.
* Stableに対する後方互換な追加はminor.
* Diagnosticsはminorで形状変更し得る.

## Non-goals

* データ取得
* UI, LOD 判定, マウスイベント処理
* 色やラベルの見た目
* Event Dots (点) の出力仕様は別途検討 (現状の Core API には含めない)

## Terms

* **step**: 離散インデックス `stepIndex` の1単位
* **domain**: 活動ジャンル. `domainId` で識別し, `angleRad` を持つ
* **ridge**: 各 step `t` の外周境界線(閉曲線). 数式上の $R(\theta, t)$ に対応する
* **band**: step `t` に属する領域. `ridge(t-1)` と `ridge(t)` に挟まれた領域
* **band center**: `band(t)` の代表半径. $\frac{R(\theta, t-1)+R(\theta, t)}{2}$

`stepIndex` は必ずしも時間ではない.

* 例: 日, 週, 月, 年
* 例: 時, 分
* 例: プロジェクトフェーズ, 学期
* 例: 任意の離散軸

## Input

### TypeScript types

型定義は `@nenrin/types` に置く. `@nenrin/core` は利用者向けに同じ型を再exportしても良い.

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
* `config.domains.length >= 1`
* `vmin` は有限(`Number.isFinite`)かつ `vmin >= 0`
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

`config.domains.length` の最小値はアルゴリズム依存.

* Core は集計と `anchors` 生成のために `>= 1` を許容する
* 閉曲線として描画する Geometry 側のアルゴリズムは, `>= 3` を要求して `Error` を throw して良い

正規化(提案).

* `tau = 2 * Math.PI`
* `thetaNorm = ((theta % tau) + tau) % tau`

実装は変更し得るが, Core の出力順序と重複判定は「正規化した角度」に基づく.

### Validation policy

不正入力は `Error` を throw する.

エラー識別は `code` を推奨する.
詳細は `docs/ErrorPolicy.md` を参照.

方針.

* Core は「入力がクリーンである」前提で計算へ入るため, 計算前に入力を全て検証して弾く
* Core はクリーンな入力から, クリーン(非有限値を含まない)な出力を返すのを目標にする

* 例: `events.length === 0`
* 例: 未定義 `domainId`
* 例: `weight` が `NaN`, `Infinity`, 負

## Stepの意味論

Core は `stepIndex` を離散的な軸として扱う.

* `stepCount = maxStepIndex + 1`
* Core は step `t` にイベントが無くても `t = 0..maxStepIndex` の全stepを計算する
* イベントが無いstepでも, 全domainが `vmin` により成長する
    * `vmin = 0` の場合, イベントが無い step は成長しない
* 入力 `events[].stepIndex = t` は, `band(t)` に属する event として解釈する

この仕様により, 入力イベントが sparse でも, 出力は dense な step 列(0..max)になる.

時間や軸を「圧縮」したい場合(イベントが無い step を作らない場合)は, Integration layer 側で `stepIndex` を再割り当てして渡す.

* 例: イベントのある step だけを抽出して `0..K` に詰める
* Core は入力 `stepIndex` の意味や単位を解釈しないため, 圧縮の方針は入力側で決める

初期半径.

* 実装上は $R(\theta, -1)=0$ とし, step `0` の更新で `vmin + growthPerActivity * A(θ,0)` が初期値になる想定

`vmin = 0` の注意.

* `vmin = 0` は許容するが非推奨
* イベントが無い step が続くと ridge が重なりやすく, band が退化(面積が 0)し得る
* この退化は, Macro の帯選択や Geometry の曲線生成を不安定にし得る

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

  // Trade-off between determinism and performance.
  // - "fast": sum weights in input order (faster, but floating point accumulation can depend on event order)
  // - "stable": sort weights within each (stepIndex, domainId) bucket before summing (slower, but order-independent)
  activitySumPolicy?: "fast" | "stable"; // default: "fast"
}

```

運用方針.

* 通常運用では, `minDomainAngleSeparationRad` を正の値で指定するのが安全
* 推奨デフォルトは `0.05` rad
    * `options` 未指定, または `minDomainAngleSeparationRad` 未指定の場合, Core は既定値を採用する
        * つまり, 角度近接チェックはデフォルトで有効
* `minDomainAngleSeparationRad = 0` の場合, 近接チェックは無効化する
    * この場合, Core は「正規化後に `===` で等しい角度」だけを重複として `Error` にする
    * `0` は `0` として扱う
    * ただし, ほぼ同値(極端に近い角度)の挙動は入力次第で想定外になり得るため, 近接チェック無効時の見た目や安定性は保証しない

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
    * `vmin = 0` の場合, イベントが無い step は成長しない

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

* `events` の順序に対する挙動は `options.activitySumPolicy` に依存する
    * `"fast"` (default): bucket `(stepIndex, domainId)` 内で入力順に加算する
        * 高速だが, 浮動小数の加算順に起因して, `events` の順序が結果へ影響し得る
    * `"stable"`: bucket `(stepIndex, domainId)` 内の `weight` を数値昇順でソートしてから加算する
        * 低速だが, 入力順序が変わっても集計結果が変わりにくい(決定性を強める)
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
* `vmin` が非有限, または `vmin < 0`
* `growthPerActivity` が非有限, または `growthPerActivity < 0`
* `config.domains[].id` の重複
* `stepIndex` が整数でない
* `stepIndex < 0`
* `domainId` が `config.domains[].id` に存在しない
* `angleRad` が非有限(`NaN`, `Infinity`)
* `weight` が非有限, または負
* `thetaRad` 正規化後の重複(同一角度). 判定は `===` で良い

`minDomainAngleSeparationRad` が指定された場合, 角度近接の違反も `Error` として良い.

## Testing notes

`activitySumPolicy` は決定性と性能のトレードオフなので, テストで期待値を分ける.

* `activitySumPolicy: "fast"` (default)
    * 同一入力(同一 `events` 配列順)なら同一出力になることを確認する
    * `events` の順序を変えた場合に, 集計結果が変わり得ることは仕様として許容する
* `activitySumPolicy: "stable"`
    * `events` の順序を任意に permute しても, `(stepIndex, domainId)` ごとの `activitySum` が不変であることを確認する
    * `weight` は有限かつ非負のみ許容なので, 数値昇順ソートが決定論の要になる

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
