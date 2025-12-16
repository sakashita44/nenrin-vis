# Core Concepts & Technical Specifications

nenrin-vis は, 個人の活動ログを「時間の経過」ではなく「活動の累積」として極座標上に可視化し, 人生の密度を有機的な年輪 (Tree Rings) として描画するプロジェクト.

## Growth Algorithm (成長アルゴリズム)

### Model: Local Accumulation (局所累積成長)

通常の極座標プロット ($r \propto t$) とは異なり, 活動があったジャンル (角度 $\theta$) の方向だけが外側へ成長する.
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
* $\alpha$ (Scaling Coefficient): 視覚的な重み付け係数.

### Boundary Condition: Periodic Cubic Spline

$\theta = 0$ (始点) と $\theta = 2\pi$ (終点) の不連続性を防ぐため, 周期的境界条件を持つ3次スプライン補間 (Periodic Cubic Spline Interpolation) を採用する.
これにより, どこが継ぎ目か分からない滑らかな閉曲線を生成する.

## Rendering Logic (描画ロジック)

パフォーマンスと美的表現を両立させるため, 「骨格」と「テクスチャ」の計算を分離する.

### Ridge (骨格 / 年輪の線)

各タイムステップ (日/週/月) ごとの $R(\theta, t)$ を計算し, パス (SVG Path等) として保持する.
これが年輪の「境界線」となる.

### Texture (テクスチャ / 点の配置)

有機的な密度表現を実現するため, 単純なランダム (Jitter) ではなく Poisson Disk Sampling を採用する.

* Logic: 新しい点を配置する際, 既存の点から一定距離 ($r_{dist}$) 以上離れていることを条件とする.
* Effect: 「細胞」のような均質さを持ちつつ自然にばらつき, 過度な重なりや不自然な空白を防ぐ.
* Target area: $R(\theta, t-1)$ から $R(\theta, t)$ の間の領域内にのみ充填する.

## LOD (Level of Detail) & Interaction

ズームレベル (拡大率) に応じて, 情報の「解像度」と「メタファー」を動的に切り替える Semantic Zooming を導入する.

| Level       | Scale  | Metaphor           | Interaction                                                                  |
| ----------- | ------ | ------------------ | ---------------------------------------------------------------------------- |
| Lv 1: Macro | 年単位 | Bio-Texture (年輪) | 全体の密度分布を閲覧, 大きな「節 (Knots)」のみ選択可能                       |
| Lv 2: Meso  | 月単位 | Bubbles (気泡)     | 近接するログをクラスタリングして表示, マウスオーバーで期間ダイジェストを表示 |
| Lv 3: Micro | 日単位 | Particles (粒子)   | 個別のログ (点) を表示, クリックで詳細データ (Notion/GitHub等) へ遷移        |

## Data Structure Example

```ts
interface NenrinConfig {
  vmin: number; // Minimum growth per step
  alpha: number; // Activity scaling factor
  domains: Domain[]; // Categories mapping to angles
}

interface Domain {
  id: string;
  label: string; // e.g. "Dev", "Life", "Hobby"
  angle: number; // 0 - 360 (degrees)
  color: string;
}

interface Activity {
  timestamp: string; // ISO 8601
  domainId: string;
  value: number; // Normalized activity score
  metadata?: any; // Raw data (URL, content text, etc.)
}
```
