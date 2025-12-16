# nenrin-vis

Visualizing Accumulation of Activities on Polar Coordinates.

個人の活動の「厚み」を, 年輪 (Tree Rings) のような極座標系で可視化するジェネラティブ・ビューワー.

## Concept

nenrin-vis は, 単なる時系列プロットではなく, 活動の蓄積と密度を極座標 (Polar Coordinates) 上に可視化するツール.

樹木が環境や成長速度に応じて異なる幅の年輪を刻むように, このビューワーは「一定の時間経過」ではなく **「活動量の累積」** を半径方向の成長として表現する.
記録のない時間は圧縮され, 充実した期間は分厚い層として刻まれるため, 自身の歩んできた軌跡の「密度」を直感的な模様として捉えられる.

詳細は [`docs/concepts.md`](docs/concepts.md) を参照.

環境構築は [`docs/Setup.md`](docs/Setup.md) を参照.

## Tech Stack

パフォーマンスと拡張性を考慮し, 以下の技術スタックを採用する.
計算ロジック (Core) と描画層 (Renderer) を分離し, 将来的なライブラリ化を見据えた設計とする.

* Language
    * TypeScript
* Core logic
    * D3.js (`d3-shape`, `d3-scale`): 周期的スプライン補間, 座標計算
* Rendering
    * HTML5 Canvas API: 数万〜数十万の活動ログ (点) の高速描画
    * React: UIコンポーネント, 状態管理
* Integration (planned)
    * Notion API: 個人の日記/活動ログの取得元
    * Next.js: ホスティング, APIルートの提供

## Features (Planned)

* Variable Growth Velocity: 活動量に応じて成長速度が変化し, アメーバ状の有機的な年輪を形成
* Semantic Zooming: ズームレベルに応じて, Macro(境界線+帯の選択) と Micro(点の表示) を切り替える
* Generative Animation: 過去から現在へ, 人生が積み重なっていく様子をアニメーションで表現

## Roadmap

現在, Phase 1 (個人サイトでのNotion連携PoC) の開発を進める.
詳細は [`docs/roadmap.md`](docs/roadmap.md) を参照.

## License

MIT License
