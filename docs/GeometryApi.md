# Geometry API (Draft)

このドキュメントは `@nenrin/geometry` の API を固定するための仕様メモ. 目的は, 曲線補間やサンプリングの試行錯誤を `@nenrin/core` から切り離し, 利用者が描画方式(Canvas, SVG, WebGL等)を選択できる状態を作ること.

関連ドキュメント.

* `docs/CoreApi.md`
* `docs/concepts.md`
* `docs/roadmap.md`

## Scope

Geometry レイヤの責務.

* Core 出力(`anchors`)を, 描画用の点列(polyline)へ変換
* 曲線補間, サンプリング, seam(0と$2\pi$)の扱い
* 補間アルゴリズムを注入できるようにする

## Non-goals

* Canvas, DOM, React への依存
* `innerRadius`, zoom, pan 等の画面文脈
* 色, 線幅, 透明度, ラベル
* LOD 判定やヒットテスト

## Inputs

Geometry の入力は Core の `anchors`.

入力 `anchors` の順序.

* Core は `anchors` を `thetaRad` 昇順(正規化後)で返す想定
* Geometry は原則として入力順序をそのまま扱い, アルゴリズム実装はこの順序を前提にして良い
* もし Core 以外から入力され, `thetaRad` の順序が保証されない場合は, Geometry 側で事前ソートする方針でも良い(ただし決定性のため tie-break を固定する)

```ts
export interface PolarAnchor {
  domainId: string;
  thetaRad: number;
  r: number;
}

export interface Ridge {
  stepIndex: number;
  anchors: PolarAnchor[];
}
```

## Outputs

Geometry の出力は選択式にする.

* `polar` 出力: `[{thetaRad, r}]`
* `xy` 出力: `[{x, y}]`

どちらも点列の点数は可変で良い.

* 点数は補間アルゴリズムや入力ドメイン数に依存して良い
* 閉曲線として描画する場合, Renderer 側で「最後と最初を結ぶ」か「closePath」を行う

```ts
export interface PolarPoint {
  thetaRad: number;
  r: number;
}

export interface XyPoint {
  x: number;
  y: number;
}

export interface RidgePolylinePolar {
  stepIndex: number;
  points: PolarPoint[];
}

export interface RidgePolylineXy {
  stepIndex: number;
  points: XyPoint[];
}
```

## Coordinate system

`xy` はモデル座標.

* 原点は常に `(0, 0)`
* `x = r * cos(thetaRad)`
* `y = r * sin(thetaRad)`

画面座標(Canvasのy軸が下向き等)への変換や, `innerRadius` 等の平行移動は Renderer 側の責務.

## Algorithm injection

補間アルゴリズムは Geometry に注入する.

```ts
export interface CurveAlgorithm {
  name: string;

  // Convert anchors to a polyline in polar coordinates.
  // points count can be variable.
  ridgeAnchorsToPolarPolyline(anchors: PolarAnchor[]): PolarPoint[];
}

export interface GeometryOptions {
  output: "polar" | "xy";

  // Optional validation.
  // If enabled, algorithm must return finite numbers.
  validateFinite?: boolean; // default: false
}
```

## API shape (draft)

```ts
export function buildRidgePolylines(
  ridges: Ridge[],
  algorithm: CurveAlgorithm,
  options: GeometryOptions
): RidgePolylinePolar[] | RidgePolylineXy[];
```

## Determinism

同一入力なら同一出力になる前提.

* `ridges` の順序は入力順序を維持する
* 各 `points` の順序はアルゴリズム実装に依存するが, 同一anchors入力なら同一順序になる必要がある

## Validation

Geometry は次を `Error` 扱いにして良い.

* `points.length < 3` (閉曲線として成立しない)
* `thetaRad`, `r`, `x`, `y` が非有限値

`validateFinite` が `true` の場合, 上記の非有限値は必ず `Error` とする.

## Notes

* `d3-shape` 等の依存は Geometry に閉じ込める
* アルゴリズムの試行錯誤は `CurveAlgorithm` 実装の差し替えで行う

パッケージ分割(推奨).

* `@nenrin/geometry`: 依存0. `buildRidgePolylines` と型, 最小アルゴリズム(`linear-closed`)のみ提供
* `@nenrin/geometry-algorithms-d3` (仮): `d3-shape` 等に依存する `CurveAlgorithm` 実装群を提供

この分割により, Geometry本体は「アルゴリズム注入」という設計を維持しつつ, 開発段階でd3系の試行錯誤を追加しやすくする.

## 初期実装のベースラインアルゴリズム

まずは最小のベースラインアルゴリズムから始める.

* 名前: `linear-closed`
* 振る舞い: 入力anchorsを補間せず, polar座標の点列として返す

閉曲線の扱い.

* 返す `points` は末尾に先頭点を再掲しなくて良い
* Renderer は `closePath` または明示的な最終線分で閉じる
* Geometry は `points.length >= 3` を検証する
