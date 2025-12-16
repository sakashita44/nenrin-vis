# Core Concepts & Technical Specifications

nenrin-vis は, 個人の活動ログを「時間の経過」ではなく「活動の累積」として極座標上に可視化し, 人生の密度を有機的な年輪 (Tree Rings) として描画するプロジェクト.

## Growth Algorithm (成長アルゴリズム)

### Model: Local Accumulation (局所累積成長)

通常の極座標プロット ($r \propto t$) とは異なり, 活動があったジャンル (角度 $\theta$) の方向だけが外側へ成長する.
ただし, 活動が無い方向も `vmin` によって極薄く成長する.
結果として, 年輪は正円ではなく, 活動の偏りを反映した歪んだ閉曲線 (アメーバ状) となる.

### Mathematical Logic

時刻 $t$ における角度 $\theta$ の半径 $R(\theta, t)$ を以下の式で定義する.

$$
R(\theta, t) = R(\theta, t-1) + \Delta r(\theta, t)
$$

$$
\Delta r(\theta, t) = v_{min} + \alpha \cdot A(\theta, t)
$$

* $v_{min}$ (Minimum Growth Velocity): 生存基底速度 ($v_{min} > 0$). 活動ゼロの期間も極薄い層を形成し, 時間軸が消失することを防ぐ (「生きていた証」の層).
* $A(\theta, t)$ (Activity Volume): そのジャンルにおける活動量.
* $\alpha$ (Scaling Coefficient): 視覚的な重み付け係数. 入力 `NenrinConfig.growthPerActivity` と同義の係数.

### Boundary Condition: Seamless Closed Curve

$\theta = 0$ (始点) と $\theta = 2\pi$ (終点) の不連続性を防ぐため, 継ぎ目の無い閉曲線を生成する.

* 候補: periodic cubic spline, closed curve interpolation など
* アルゴリズムは PoC で試行錯誤しながら決定する

## Rendering Logic (描画ロジック)

パフォーマンスと探索性を両立させるため, Renderer は以下を分離して扱う.

* 境界線 (Ridge): 年輪の輪郭. 常に表示する
* 帯 (Band): ステップが占める領域. Macro での選択単位
* 点 (Event Dots): Micro のみで表示する. 常時表示しない

### Ridge (骨格 / 年輪の線)

各タイムステップ (日/週/月) ごとの $R(\theta, t)$ を計算し, パス (SVG Path等) として保持する.
これが年輪の「境界線」となる.

### Band (帯 / ステップ領域)

ここでの $R(\theta, t)$ は, step $t$ の更新を適用した後の外周境界(ridge)を表す.

step $t$ は, 2本の境界線 $R(\theta, t-1)$ と $R(\theta, t)$ に挟まれた領域(band)を持つ.
イベントは本質的に, この帯の内部に属する.

入力イベント `event.stepIndex = t` は, `band(t)` に属する event として解釈する.

* 表現イメージ

```text
--- step t+1 ---
<events...>
--- step t ---
<events...>
--- step t-1 ---
```

Macro では帯を選択単位とし, 選択した帯に含まれるイベント群を確認できる.

### Event Dots (点 / Micro のみ)

点の常時描画は不要とし, Micro でのみ点を表示する.
Micro は「点が重ならずに表示できる」幾何条件を満たす場合に限って有効化する.

* 1 event = 1 dot とし, 点の密度表現 (Texture) は扱わない
* 点が重なる状況は Micro を有効化しない (Macro 側の帯選択にフォールバックする)

直線状に並んで見た目が単調にならないよう, 点の座標は「計算上の代表位置」から描画時にのみ微小にずらす.
このずらしは読みやすさのための表示レイアウトであり, Core の意味論や集計結果は変えない.

* 基本: `domain.angleRad` を中心角とし, 帯の代表半径(例: $\frac{R(t-1)+R(t)}{2}$)に配置する
* 描画時のみ: $\theta$ と $r$ に微小オフセット $(\Delta\theta, \Delta r)$ を加える
* オフセットは帯とドメイン範囲からはみ出さないよう clamp する
* オフセットは決定論にする (ズームやパンで点が揺れない)

実装方針.

* dots の仕様と配置アルゴリズムは Core から分離し, 補助パッケージ(例: `@nenrin/dots`)で扱う
* 詳細は `docs/DotsApi.md` を参照

### Inner Radius (中心余白)

`stepIndex = 0` を原点に直結すると, 中心付近にイベントが集中して見た目が破綻しやすい. これを避けるため, Renderer 側で内側に余白(最小半径)を持たせる.

* 例: `innerRadius` を導入し, 画面上の半径を `r_screen = innerRadius + scale * r_core` のように平行移動する
* Core の計算結果(相対的な成長)は維持しつつ, 見た目だけ安定させられる

### Density Near Center (中心付近の密度)

中心付近の過密は, 活動密度ではなく「中心に近いほど円周が短い」ことが原因のアーティファクトになり得る.
これを「過去ほど圧縮されたコンテキスト」というメタファとして受け入れるなら, Renderer 側での密度補正は不要となる.

点を描く Micro では, 幾何条件により「黒つぶれする状況」をそもそも避ける.
黒つぶれが残る場合のみ, 表現を変えずに見た目を軽く補正する.

* 点サイズ, 透明度を半径に応じて変える

## LOD (Level of Detail) & Interaction

LOD は Macro と Micro の2段とする.

* Macro
    * 境界線 (Ridge) と帯 (Band) を表示
    * 帯は step 単位で選択する
    * step の単位はズームに応じて変わる (例: 月なら30, 日なら1)
    * 点は描画しない
* Micro
    * 表示範囲に対して点が過密にならない幾何条件を満たす場合のみ, 点を表示する
    * 点は表示範囲内の帯に属するイベントだけを計算して描画する

### Geometric Condition (Micro 切り替え条件)

Micro の切り替えはズーム閾値ではなく, 幾何条件で判定する.
例えば, 現在の表示範囲で「隣接イベント間の期待距離」が一定ピクセル以上になる場合にのみ点を出す.

幾何条件はデータ分布に依存するため, 初期実装は保守的にする.

* 例: 表示範囲内の event 数を $n$, 表示可能領域の面積を $S$ とすると, 期待間隔 $d \approx \sqrt{S/n}$
* $d$ が `minDotSpacingPx` 以上なら Micro, 未満なら Macro

点の微小オフセットを使う場合, `minDotSpacingPx` は「点が読める最小間隔」の安全側見積もりとして設定する.

### Band Interaction (帯選択)

Macro では帯を選択すると, その step に属するイベント群を参照できる.
点を常時描画しなくても, 詳細参照が成立する.

帯の視認性が問題になった場合のみ, 早材/晩材のように帯背景を交互に薄く切り替える.

## Library Boundary (責務分割)

nenrin-vis (Core) は, 入力データを離散ステップに正規化済みである前提で扱う. つまり, timestampやタイムゾーン, 「日/週/月」の区切りは Core の責務に含めない.

* Integration layer (入力側) の責務
    * timestampなどの生データを `stepIndex` (整数) へ離散化
    * 1つの生ログが複数ドメインにまたがる場合の分割(duplicate, split等)と, その重み付け
    * 正規化やスコアリング(滞在時間, 文字数, 重要度など)を `weight` に変換
* Core (nenrin-core) の責務
    * `(stepIndex, domainId, weight)` の集合を集計し, 描画用の骨格(年輪)を生成
    * Event Dots (点) の出力は別途検討とし, 現時点では Core API に含めない
    * `vmin`, `growthPerActivity` 等のパラメータで成長モデル(例: $\Delta r(\theta, t)$)を制御
    * ドメイン角度は入力で与えられたものをそのまま利用(自動配置しない)

中間レイヤとして, Core と Renderer の間に Geometry レイヤを挟む.

* Geometry の責務
    * Core 出力(`anchors`)を, 描画用の曲線(点列, path)へ変換
    * 曲線補間, サンプリング, seam(0と$2\pi$)の扱い
    * d3-shape 等の依存を Core から隔離
    * 点列(polyline)の点数は可変で良い(補間アルゴリズムに依存)
    * 出力は `polar` と `xy` を選択式にして良い(`xy` はモデル座標)

### Core / Geometry / Renderer Split

配布単位としても, 計算(Core)と描画(Renderer)を分離する.

TypeScript配布では, CoreとRendererを別パッケージとして公開し, 必要なら統合ラッパ(メタパッケージ)を追加する構成が典型となる.

* Core
    * 純粋な計算層. Canvas, DOM, React に依存しない
    * `stepIndex` の起点(0が何日か)や単位(日/週/月)の意味付けは扱わない
* Geometry
    * Core 出力を描画用ジオメトリへ変換する層
    * 曲線補間の試行錯誤をこの層に閉じ込める
* Renderer
    * Core出力をCanvas等へ描画する層
    * 期間ラベルやツールチップ等, 「起点」や「単位」が必要な表示文脈を扱う
    * `innerRadius`, zoom, pan, y軸方向等の画面座標系の解釈は Renderer 側の責務

Event Dots (点) の扱い.

* dots の配置ルールは試行錯誤になりやすいため, Core から分離する
* `events` と Core 出力を入力に dots を生成する補助パッケージ(例: `@nenrin/dots`)を用意しても良い
* dots の配置は関数/アルゴリズムとして外部注入できる形が扱いやすい

例として, 以下のような配布形態を想定する.

* `@nenrin/core`
    * 入力イベントから骨格/テクスチャの座標を計算して返す
* `@nenrin/geometry` (仮)
    * Core出力を補間して, 描画用の曲線データへ変換する
* `@nenrin/renderer-canvas` (任意)
    * reference implementation. Core/Geometry/Dots の出力を描画して見た目を調整する

## Data Structure Example

```ts
interface NenrinConfig {
    vmin: number; // Minimum growth per step
    growthPerActivity: number; // Growth per activity sum (α)
    domains: Domain[]; // Categories mapping to angles
}

interface Domain {
  id: string;
  label: string; // e.g. "Dev", "Life", "Hobby"
  angleRad: number; // 0 - 2*pi (radians). 角度は入力で与える
}

/**
 * Core に渡す入力イベント.
 * 1イベントは1つのドメインのみを持つ.
 * 複数ドメインに出したい場合は, 入力側でイベントを分割して渡す.
 */
interface Event {
    stepIndex: number; // Discrete step index (integer, 0..N). Event belongs to band(t) between ridge(t-1) and ridge(t). timestamp is out of Core scope
  domainId: string;
  weight?: number; // Default: 1.0. Must be finite and non-negative
  metadata?: unknown; // Optional passthrough
}

interface NenrinInput {
  config: NenrinConfig;
  events: Event[];
}
```

### Aggregation Note (Aの定義)

Core 内部では, 入力イベントをステップとドメイン単位で集計し, $A(\theta, t)$ を構成する.

* 典型例: あるドメイン $d$ に対応する角度を $\theta_d$ とすると, $A(\theta_d, t) = \sum weight$.
* 実装上, この集計値を `activitySum` と呼ぶ
* `weight` 未指定は `1` として扱う.
* 角度方向のスムージング(隣接ドメインへ滲ませる等)は必要になった時点で追加検討とする.

## Input Constraints (入力制約)

* `events` は1件以上を必須とする
* `vmin` は有限値のみを許容する. `vmin > 0` を要求する
* `growthPerActivity` は有限値のみを許容する. `growthPerActivity >= 0` を要求する
* `domains` は1件以上を必須とする
    * Coreの集計と `anchors` 生成としては `>= 1` で成立する
    * ただし, 閉曲線として描画する曲線補間アルゴリズムは `>= 3` を要求して `Error` を throw して良い
* `domains[].id` は重複禁止
* `domains[].angleRad` は有限値のみを許容する. `NaN`, `Infinity` は不正入力として扱う
* `stepIndex` は整数のみを許容する. `0..N` の範囲を前提とする
* `domainId` は `domains[].id` のいずれか
* `weight` は非負のみを許容する. `0` は許容するが推奨しない
* `weight` は有限値のみを許容する. `NaN`, `Infinity` は不正入力として扱う

## Event Identity (eventId の扱い)

Core 入力として `eventId` は要求しない.
Micro の点表示で必要となる「点の見た目の安定性」は, `eventKey` を優先し, 無い場合は Renderer または Dots 側で内部的に seed を生成して担保する.

* `eventKey?: string` があればそれを優先して seed に使う
* 無ければ `stepIndex`, `domainId`, `weight`, `metadata` 等から決定論に seed を生成する
* 同一内容のイベントが複数ある場合は, 同一キーの出現回数カウンタを seed に混ぜて分離する

## Domain angle input policy

ドメイン角度は入力で与える方針とする.

* ドメインの近接度は設計意図になり得るため, Core は角度を自動配置しない
* 将来, 角度をインタラクティブに調整する domain editor を用意しても良い

## Step Range (Nの定義)

* `N` (最大ステップ) は, 入力イベント群の `stepIndex` の最大値として扱う
* `stepCount = N + 1` を想定する
* カレンダサービスではないため, `N` は「外皮」(最外周)の定義として最大値を採用して良い

## Out of Scope (責務外)

* `weight` のクリッピングや正規化は Integration layer 側の責務
* Core は入力検証(負値, 非有限値, 未定義ドメイン等)のみを扱う

## Validation Policy (入力検証ポリシー)

* Core は不正入力に対して `Error` を throw する
    * 例: `events.length === 0`

## Performance Notes (パフォーマンス目安)

描画と計算の負荷は, 主に `stepCount` と角度方向のサンプル数, 粒子数で決まる. 上限は実行環境に依存するため, Coreとして厳密な上限は設けない.

* `stepCount` が大きいほど, 骨格生成の計算/メモリが増える
* Micro の点は表示範囲内のみ計算することで, 粒子数を抑えられる

## Empty Input (空入力)

* イベント0件は Core では不正入力として扱い, `Error` を throw する
* 空状態UIは Integration layer または Renderer 側で扱う
