# Error Policy

このドキュメントは, `@nenrin/*` のエラー方針を定義する.

目的.

* 利用側がエラーを機械的に判定してフォールバックできる状態を作る.
* 例外メッセージ文言に依存しない運用を可能にする.
* 将来, エラー型を拡張しても後方互換を保ちやすくする.

## Core Principle

* 不正入力は例外をthrowする.
* 内部計算の失敗(非有限値, 幾何の退化など)も例外をthrowする.
* 例外の識別は `code` で行う.
* `message` は人間向けで, 安定性を保証しない.

## Error Shape

共通のエラー形状は次を推奨する.

```ts
export type NenrinErrorCode = string;

export class NenrinError extends Error {
  readonly code: NenrinErrorCode;
  readonly issues?: NenrinIssue[];

  constructor(
    code: NenrinErrorCode,
    message: string,
    options?: { cause?: unknown; issues?: NenrinIssue[] }
  );
}

export interface NenrinIssue {
  // JSON pointer風のパス, 例: "/events/0/stepIndex".
  path: string;

  // 機械可読な理由キー, 例: "not-integer", "negative", "non-finite".
  reason: string;

  // 任意. デバッグ用のスナップショット.
  value?: unknown;
}
```

注記.

* `NenrinError` は必須ではない.
* 少なくとも `code` は安定キーとして導入する.
* `issues` は入力検証の説明に使う. 出力を小さくしたい場合は省略して良い.

## Stability

* `code` は安定対象.
* `issues[].path` と `issues[].reason` は安定対象.
* `message` は非安定.

## Error Codes

コード体系はパッケージ横断で衝突しないように接頭辞を使う.

* Core: `NENRIN_CORE_*`
* Geometry: `NENRIN_GEOMETRY_*`
* Dots: `NENRIN_DOTS_*`

### Core

* `NENRIN_CORE_INPUT_INVALID`
    * 入力全体が不正. 詳細は `issues` に含める.
* `NENRIN_CORE_DOMAIN_ID_DUPLICATE`
* `NENRIN_CORE_DOMAIN_ID_UNKNOWN`
* `NENRIN_CORE_STEP_INDEX_INVALID`
* `NENRIN_CORE_ANGLE_NON_FINITE`
* `NENRIN_CORE_WEIGHT_INVALID`
* `NENRIN_CORE_DOMAIN_ANGLE_DUPLICATE`
* `NENRIN_CORE_DOMAIN_ANGLE_TOO_CLOSE`

### Geometry

* `NENRIN_GEOMETRY_INPUT_INVALID`
* `NENRIN_GEOMETRY_INSUFFICIENT_ANCHORS`
* `NENRIN_GEOMETRY_POINTS_NON_FINITE`
* `NENRIN_GEOMETRY_VMIN_REQUIRED`

### Dots

* `NENRIN_DOTS_INPUT_INVALID`
* `NENRIN_DOTS_ALGORITHM_FAILED`
