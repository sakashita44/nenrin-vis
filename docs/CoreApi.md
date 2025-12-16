# Core API (Draft)

このドキュメントは `nenrin-core` の API を固定するための仕様メモ. 実装へ移れる状態を作るのが目的.

関連ドキュメント.

* `docs/concepts.md`
* `docs/roadmap.md`
* `docs/GeometryApi.md`

## Scope

`nenrin-core` の責務は, `(stepIndex, domainId, weight)` の集合から描画用の幾何データを生成すること.

* 入力の離散化(タイムゾーン, 日/週/月区切り)は扱わない
* Canvas, DOM, React に依存しない
* 曲線補間やサンプリングは扱わない(中間レイヤへ分離)

## Non-goals

* Notion API やデータ取得
* UI, LOD 判定, マウスイベント処理
* 色やラベルの見た目

## Terms

* **step**: 離散時間インデックス `stepIndex` の1単位
* **domain**: 活動ジャンル. `domainId` で識別し, `angleRad` を持つ
* **ridge**: 各 step の外周境界線(閉曲線)
* **band**: step `t-1` と `t` の ridge に挟まれた領域

## Input

### TypeScript types

```ts
export interface NenrinConfig {
  vmin: number;
  alpha: number;
  domains: Domain[];
}

export interface Domain {
  id: string;
  label: string;
  angleRad: number;
}

export interface Event {
  stepIndex: number;
  domainId: string;
  weight?: number;
  metadata?: unknown;
}

export interface NenrinInput {
  config: NenrinConfig;
  events: Event[];
}
```

### Constraints

* `events.length >= 1`
* `stepIndex` は整数
* `stepIndex` は `0..N` を前提とする
* `domainId` は `config.domains[].id` のいずれか
* `angleRad` は入力で与える(自動配置しない)
* `angleRad` は有限(`Number.isFinite`)である必要がある
* `weight` は未指定なら `1`
* `weight` は有限(`Number.isFinite`)かつ非負

`angleRad` は任意の実数を許容するが, Core は内部的に $2\pi$ 周期で正規化して扱う(順序付け, 重複判定のため). 推奨は入力側で `0..2*pi` に正規化して渡す.

### Validation policy

不正入力は `Error` を throw する.

* 例: `events.length === 0`
* 例: 未定義 `domainId`
* 例: `weight` が `NaN`, `Infinity`, 負

## Stepの意味論

Core は `stepIndex` を離散的なタイムラインとして扱う.

* `stepCount = maxStepIndex + 1`
* Core は step `t` にイベントが無くても `t = 0..maxStepIndex` の全stepを計算する
* イベントが無いstepでも, 全domainが `vmin` により成長する

初期半径.

* 実装上は $R(\theta, -1)=0$ とし, step `0` の更新で `vmin + alpha * A(θ,0)` が初期値になる想定

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

  // Ridge geometry for each step
  ridges: Ridge[];

  // Optional: per-step aggregated activity, useful for debug/analysis
  activityByStepDomain?: number[][]; // [t][domainIndex]
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
```

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
  // If undefined, only duplicate angle detection is performed.
  minDomainAngleSeparationRad?: number;

  // Whether to include activityByStepDomain in the output.
  includeActivityMatrix?: boolean; // default: false
}
```

### Parameter semantics

* `vmin` の適用範囲
    * `vmin` は全 domain に対して毎 step 適用する
    * event が無い step でも成長する(時間の層が完全に消えない)

* `alpha`
    * `weight` の集計値に対するスケール係数

## Sampling policy

Core は角度方向を入力 `domains[].angleRad` に依存させる.

* `domains[].angleRad` は API で入力必須
* 角度の近接度は入力側の設計意図になり得るため, Core は自動配置しない
* バリデーションとして, 同一角度(重複)は `Error` 扱いにするのが安全
* 近接度チェックは `minDomainAngleSeparationRad` が指定された場合のみ適用する

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
* `anchors` の順序は固定
  * `anchors` は `thetaRad` 昇順(正規化後)で返す
  * `config.domains` の入力順序は出力へ影響しない
  * `domainCount = config.domains.length`

`activityByStepDomain` を含める場合, `[t][domainIndex]` の `domainIndex` は上記 `anchors` の順序と一致させる.

## Notes for renderer

Renderer 側で扱う想定.

* Geometry レイヤ(`nenrin-geometry`)を使い, `anchors` を点列へ変換
* `innerRadius` の導入
* Micro の点座標の微小オフセット
* seed の生成(決定論)

## Open questions

* PoC の curve は何を採用するか(geometryレイヤの責務)
* 角度近接バリデーション(`minDomainAngleSeparationRad`)の既定方針
