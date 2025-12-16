# nenrin-vis

このリポジトリはAIコーディングサービスを利用して作成しています．

Visualizing Accumulation of Activities on Polar Coordinates.

個人の活動の「厚み」を, 年輪 (Tree Rings) のような極座標系で可視化するジェネラティブ・ビューワー.

入力の `stepIndex` は「日」に限らず, 時, 分, 年, あるいは時間でない任意の離散軸でも良い.

## Concept

nenrin-vis は, 単なる時系列プロットではなく, 活動の蓄積と密度を極座標 (Polar Coordinates) 上に可視化するツール.

樹木が環境や成長速度に応じて異なる幅の年輪を刻むように, このビューワーは「一定の時間経過」ではなく **「活動量の累積」** を半径方向の成長として表現する.
記録のない時間は圧縮され, 充実した期間は分厚い層として刻まれるため, 自身の歩んできた軌跡の「密度」を直感的な模様として捉えられる.

コンセプトの主対象は成長記録(活動ログ)だが, ライブラリとしては特定ドメインに固定しない.

* `stepIndex` は時間に限らず, 任意の離散軸で良い
* `domain` はカテゴリでも方角でも良い
* つまり, 「離散ステップ上の累積」を年輪状に変換する汎用の計算ライブラリとして利用できる

詳細は [`docs/concepts.md`](docs/concepts.md) を参照.

dots の仕様は [`docs/DotsApi.md`](docs/DotsApi.md) を参照.

環境構築は [`docs/Setup.md`](docs/Setup.md) を参照.

## Docs

* 実装方針: [`docs/Policy.md`](docs/Policy.md)
* Core API: [`docs/CoreApi.md`](docs/CoreApi.md)
* Geometry API: [`docs/GeometryApi.md`](docs/GeometryApi.md)
* Dots API: [`docs/DotsApi.md`](docs/DotsApi.md)
* Error policy: [`docs/ErrorPolicy.md`](docs/ErrorPolicy.md)
* Concept: [`docs/concepts.md`](docs/concepts.md)
* Setup: [`docs/Setup.md`](docs/Setup.md)
* Roadmap: [`docs/roadmap.md`](docs/roadmap.md)

## Use Cases

* **Personal Chronicle:** 「何もしなかった期間」は省略され, 「充実した期間」が強調されるバイオグラフィー.
* **Skill Growth:** 学習量(インプット/アウトプット)に応じて, 特定領域が肥大化していくスキル可視化.
* **Project Density:** プロジェクトごとのリソース投下量やコミット密度の推移確認.

## Tech Stack

パフォーマンスと拡張性を考慮し, 以下の技術スタックを採用する.
計算ロジック (Core) と描画層 (Renderer) を分離し, 将来的なライブラリ化を見据えた設計とする.

* Language
    * TypeScript
* Types
    * `@nenrin/types`: パッケージ間のIF(中間定義)を提供するtype-onlyパッケージ. `@nenrin/core` を使わずに `@nenrin/geometry` 等を利用する場合も, この型に依存すれば契約を維持できる
* Core logic
    * `@nenrin/core`: 依存0の計算層(推奨パス). 入力eventsを集計し, ridgeの`anchors`(polar)を生成. ただし `@nenrin/geometry` は `ridges/anchors` を直接渡せば `core` なしでも利用できる
* Geometry
    * `@nenrin/geometry`: 依存0の幾何層. `anchors`を描画用の点列へ変換(アルゴリズムは外部注入)
    * `@nenrin/geometry-algorithms-d3` (planned): `d3-shape` 等に依存する曲線補間アルゴリズム群
* Dots (planned)
    * `@nenrin/dots`: `events` と Core 出力から dots を生成し, Micro 表示と `metadata` 参照を成立させる(配置は外部注入)
* Rendering (planned)
    * `@nenrin/renderer-canvas`: reference implementation. Core/Geometry/Dots の出力を描画して見た目を調整する用途

このリポジトリの成果物はライブラリ.

## Package naming

このリポジトリ内のライブラリパッケージは, npm scope 付きで公開する前提.

* `@nenrin/core`
* `@nenrin/types`
* `@nenrin/geometry`
* `@nenrin/dots`
* `@nenrin/geometry-algorithms-d3` (planned)

## License

MIT License
