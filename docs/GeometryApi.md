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

入力 `anchors` の形状(想定).

* Core 出力を入力とする場合, `anchors` は domain 欠損を作らず, 常に全domainを含む想定
* `anchors` は `thetaRad` 昇順で, `domainId` と `thetaRad` は一意(正規化後)である想定

`anchors.length` の最小値.

* Core は `domains.length >= 1` を許容し得る
* Geometry は閉曲線として扱う都合上, アルゴリズム実装が `anchors.length < 3` を `Error` 扱いにして良い

```ts
export interface PolarAnchor {
  domainId: string;
  thetaRad: number;
  r: number;
}

export interface Ridge {
  // step `t` for `ridge(t)`.
  // `ridge(t)` corresponds to the outer boundary after applying step `t` (i.e. $R(\theta, t)$).
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
export interface CurveAlgorithm<TCtx = undefined> {
  name: string;

  // Convert a ridge to a polyline in polar coordinates.
  // points count can be variable.
  ridgeToPolarPolyline(ridge: Ridge, ctx: TCtx): PolarPoint[];
}

export interface GeometryOptions<TCtx = undefined> {
  output: "polar" | "xy";

  // Optional algorithm context.
  // Geometry does not interpret this value.
  // Algorithms may require specific fields and throw Error if missing.
  ctx?: TCtx;

  // Optional validation.
  // If enabled, algorithm must return finite numbers.
  validateFinite?: boolean; // default: false
}
```

parameter injection policy.

* GeometryのAPIは, アルゴリズムの差し替えと実行(点列化)だけを固定する
* アルゴリズムの入力は2種類に分ける
    * algorithm instanceに閉じ込める値(factoryで注入). 特定アルゴリズムの挙動を決めるパラメータ
    * 実行時に渡す値(`options.ctx`). データセットや環境に依存し, 実行ごとに変わり得るコンテキスト
* この分離により, Geometryの公開型は増殖せず, 利用者は自由にアルゴリズムと引数を注入できる

## API shape (draft)

```ts
export function buildRidgePolylines(
  ridges: Ridge[],
  algorithm: CurveAlgorithm<undefined>,
  options: GeometryOptions<undefined> & { output: "polar" }
): RidgePolylinePolar[];

export function buildRidgePolylines(
  ridges: Ridge[],
  algorithm: CurveAlgorithm<undefined>,
  options: GeometryOptions<undefined> & { output: "xy" }
): RidgePolylineXy[];

export function buildRidgePolylines(
  ridges: Ridge[],
  algorithm: CurveAlgorithm<undefined>,
  options: GeometryOptions<undefined>
): RidgePolylinePolar[] | RidgePolylineXy[];

export function buildRidgePolylines<TCtx>(
  ridges: Ridge[],
  algorithm: CurveAlgorithm<TCtx>,
  options: GeometryOptions<TCtx> & { output: "polar" }
): RidgePolylinePolar[];

export function buildRidgePolylines<TCtx>(
  ridges: Ridge[],
  algorithm: CurveAlgorithm<TCtx>,
  options: GeometryOptions<TCtx> & { output: "xy" }
): RidgePolylineXy[];

export function buildRidgePolylines<TCtx>(
  ridges: Ridge[],
  algorithm: CurveAlgorithm<TCtx>,
  options: GeometryOptions<TCtx>
): RidgePolylinePolar[] | RidgePolylineXy[];
```

context plumbing.

* `buildRidgePolylines` は `options.ctx` をそのまま `algorithm.ridgeToPolarPolyline(ridge, ctx)` へ渡す
* `options.ctx` が未指定の場合, `ctx` は `undefined` になり得る

typing note.

* overload を用意して, `options.output` が literal の場合に戻り型が自動で確定する形にする
* 呼び出し側で `RidgePolylinePolar[] | RidgePolylineXy[]` の union を手で絞り込む必要を減らせる

## Determinism

同一入力なら同一出力になる前提.

* `ridges` の順序は入力順序を維持する
* 各 `points` の順序はアルゴリズム実装に依存するが, 同一入力(`ridge`, `ctx`)なら同一順序になる必要がある

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

次に, nenrin向けの推奨アルゴリズム(提案).

* 名前: `polar-linear-virtual-anchors`
* 狙い: 年輪のベース(円)から大きく外れにくくしつつ, anchorsを必ず通り, 自己交差(意図しない交差)を避ける

前提.

* Coreの `r` は常に有限かつ正(`vmin > 0` の積み上げ)である前提
* curveはモデルとして `r(\theta)` の形(角度ごとに半径が1つ)を維持する
    * これにより, `r(\theta) > 0` を保てば幾何的に自己交差しない

パラメータ(提案).

* `ctx.baseCircle: { type: "vmin"; vmin: number }`
* `virtualAnchorCount: number` (例: 128, 256). algorithm生成時に固定
* `returnStrength: number` ($k \in [0, 1]$). algorithm生成時に固定

`polar-linear-virtual-anchors` は `ctx.baseCircle.type === "vmin"` を要求し, 満たされない場合は `Error` を throw して良い.

algorithm factory (proposal).

```ts
export interface NenrinBaseCircleSpec {
  type: "vmin";
  vmin: number;
}

export interface NenrinCurveContext {
  baseCircle: NenrinBaseCircleSpec;
}

export interface PolarLinearVirtualAnchorsParams {
  virtualAnchorCount: number;
  returnStrength: number; // k in [0, 1]
}

export function createPolarLinearVirtualAnchorsAlgorithm(
  params: PolarLinearVirtualAnchorsParams
): CurveAlgorithm<NenrinCurveContext>;
```

円ベース(必須仕様).

* step `t = ridge.stepIndex` のベース円半径を $r_{base}(t)$ とする
* 初期条件として $R(\theta, -1)=0$ を採用する場合, 次が自然

$$
r_{base}(t) = (t + 1) \cdot v_{min}
$$

アルゴリズム(提案).

* 入力: anchors $(\theta_i, r_i)$ を $\theta$ 昇順(正規化済み)として扱う
* 角度グリッドを作る: $\phi_j = \frac{2\pi j}{M}$, $M = virtualAnchorCount$
* 各 $\phi_j$ で, 隣接する anchors 間で $r$ を線形補間して $r_{interp}(\phi_j)$ を得る
    * wrap(最後と最初)も補間区間に含める
* ベース円へ戻すvirtual半径を作る

$$
r_{virtual}(\phi_j) = (1-k)\,r_{interp}(\phi_j) + k\,r_{base}(t)
$$

* 出力点列 `points` は次を満たす
    * 実 anchors は必ず含める(anchorsを必ず通る)
    * 各 $\phi_j$ の virtual点も追加して良い
    * ただし, $\phi_j$ が実 anchor の角度と一致する場合, virtual点は捨てて実 anchor を優先する
* `points` は $\theta$ 昇順で返す

備考.

* `returnStrength = 0` は「戻さない」
* `returnStrength = 1` は「可能な限りベース円へ戻す」
    * ただし実anchorsを必ず通すため, anchor角度ではベース円からズレる
* `virtualAnchorCount` を大きくすると「戻り」が滑らかになる(計算量は増える)

閉曲線の扱い.

* 返す `points` は末尾に先頭点を再掲しなくて良い
* Renderer は `closePath` または明示的な最終線分で閉じる
* Geometry は `points.length >= 3` を検証する
