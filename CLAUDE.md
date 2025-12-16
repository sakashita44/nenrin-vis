# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

nenrin-vis is a TypeScript library for visualizing accumulation of activities on polar coordinates, similar to tree rings. It transforms activity data into a generative tree-ring-like visualization where accumulated activity determines radial growth rather than time progression.

Key concept: Activity density is visualized as "thickness" on polar coordinates, where periods with no activity are compressed and dense periods appear as thick layers.

## Repository Structure

This is a pnpm monorepo with the following packages:

* `packages/core/`: Zero-dependency core computation layer. Aggregates input events and generates ridge `anchors` (polar coordinates)
* `packages/geometry/`: Zero-dependency geometry layer. Converts `anchors` to drawable point sequences (polylines) with injectable curve interpolation algorithms

Planned packages (not yet implemented):

* `@nenrin/dots`: Generate dots from events and Core output with injectable placement algorithms
* `@nenrin/geometry-algorithms-d3`: Curve interpolation algorithms using d3-shape
* `@nenrin/renderer-canvas`: Reference Canvas renderer implementation

## Package Architecture

### Package Boundaries

Each package has clearly defined responsibilities (see `docs/Policy.md`):

* **@nenrin/core**: Aggregates `events` by `(stepIndex, domainId)`, generates ridge `anchors` using `vmin` and `growthPerActivity`. Does NOT handle curve interpolation, sampling, or rendering
* **@nenrin/geometry**: Converts Core's `anchors` to polylines (point sequences) for rendering. Curve interpolation algorithms are injectable. Does NOT handle UI, innerRadius, zoom/pan, or hit testing

All packages maintain zero runtime dependencies. External dependencies (like d3-shape) are isolated to separate packages.

## Common Commands

### Install dependencies

```sh
pnpm install
```

### Build all packages

```sh
pnpm build
```

### Clean build artifacts

```sh
pnpm clean
```

### Type checking

```sh
pnpm typecheck
```

### Lint (placeholder)

```sh
pnpm lint
```

### Build individual package

```sh
cd packages/core
pnpm build
```

### Type check individual package

```sh
cd packages/core
pnpm typecheck
```

## Build System

* Build tool: `tsup`
* Outputs: ESM + CJS + TypeScript declarations (`.d.ts`) + sourcemaps
* Package manager: pnpm (via corepack, no global install required)
* TypeScript config: Shared base config in `tsconfig.base.json`
* Strict mode enabled with `noUncheckedIndexedAccess` and `exactOptionalPropertyTypes`

## Environment Setup

Node.js and pnpm may only be available after running `Set-Env.ps1` (located at `../../tools/Set-Env.ps1`).

To enable corepack and activate pnpm:

```sh
corepack enable
corepack prepare pnpm@latest --activate
```

## Key Architectural Concepts

### Core Concepts (from docs/concepts.md)

* **step**: Discrete index unit (`stepIndex`), not necessarily time-based. Can represent days, hours, project phases, etc.
* **domain**: Activity category identified by `domainId` with an `angleRad` position
* **ridge**: Outer boundary curve for step `t`, denoted as $R(\theta, t)$
* **band**: Region belonging to step `t`, bounded between `ridge(t-1)` and `ridge(t)`
* **anchors**: Polar coordinate control points (`{domainId, thetaRad, r}`) defining ridge geometry

### Data Flow

1. Input: `events` array with `{stepIndex, domainId, weight?, metadata?, eventKey?}`
2. Core: Aggregates events and generates `anchors` for each ridge
3. Geometry: Converts `anchors` to drawable `points` using injectable curve algorithm
4. Renderer: Draws polylines on Canvas/SVG (not in this repo yet)

### Growth Model

* Each step `t` accumulates activity: $R(\theta, t) = R(\theta, t-1) + v_{min} + \alpha \cdot A(\theta, t)$
* `vmin`: Minimum growth per step (prevents bands from collapsing to zero)
* `growthPerActivity` (α): Conversion factor from activity sum to radial growth
* Initial condition: $R(\theta, -1) = 0$

## Error Handling (docs/ErrorPolicy.md)

* All errors use `code` field for machine-readable identification
* Error codes follow convention: `NENRIN_CORE_*`, `NENRIN_GEOMETRY_*`, `NENRIN_DOTS_*`
* `message` is human-readable but NOT stable for programmatic handling
* Invalid inputs throw errors immediately before computation
* Internal computation failures (non-finite values, degenerate geometry) also throw errors

### Common Core Error Codes

* `NENRIN_CORE_INPUT_INVALID`: General input validation failure
* `NENRIN_CORE_DOMAIN_ID_DUPLICATE`: Duplicate domain IDs in config
* `NENRIN_CORE_DOMAIN_ID_UNKNOWN`: Event references unknown domainId
* `NENRIN_CORE_ANGLE_NON_FINITE`: Domain angle is NaN or Infinity
* `NENRIN_CORE_DOMAIN_ANGLE_DUPLICATE`: Duplicate normalized angles

## Validation Policy

* Validate ALL inputs before computation
* Separate validation from core computation logic
* Pattern: `validateXxx(input)` + `computeXxxUnsafe(validatedInput)`
* Computation code assumes validated/clean inputs

## Determinism

### Core

* Same input produces same output
* `activitySumPolicy` option controls determinism vs performance trade-off:
    * `"fast"` (default): Sum weights in input order (faster, but order-dependent due to floating point)
    * `"stable"`: Sort weights within each bucket before summing (slower, order-independent)
* Output `anchors` are always sorted by `thetaRad` (normalized), independent of input domain order

### Geometry

* Same input produces same point sequence
* `ctx` parameter is pass-through; Geometry does not interpret it

## API Stability

### Stable (SemVer major for breaking changes)

* Public function signatures exported from package root
* Public types and their semantic meaning
* Input constraints and ordering guarantees
* Reproducibility contracts

### Diagnostics (SemVer minor for changes)

* Debug/analysis helper outputs
* Optional fields like `activitySumByStepDomain`, `activitySumSeriesByDomainId`

### Experimental (SemVer minor for breaking changes)

* Trial algorithms (e.g., `polar-linear-virtual-anchors`)
* Features explicitly marked experimental

## Documentation Structure

* `docs/Policy.md`: Implementation policies and package boundaries
* `docs/ErrorPolicy.md`: Error handling conventions
* `docs/CoreApi.md`: Core package API specification
* `docs/GeometryApi.md`: Geometry package API specification
* `docs/DotsApi.md`: Dots package API specification (planned)
* `docs/concepts.md`: Mathematical concepts and terminology
* `docs/Setup.md`: Development environment setup
* `docs/roadmap.md`: Project roadmap

## Implementation Anti-patterns

Avoid:

* Mixing curve interpolation or rendering concerns into Core
* Branching on error message strings
* Scattering input validation throughout computation loops
* Coupling experimental algorithms directly to stable APIs
* Adding dependencies to core/geometry/dots packages

## Testing Considerations

* Test input constraint enforcement
* Test ordering guarantees
* For `activitySumPolicy: "fast"`: Verify determinism with fixed input order
* For `activitySumPolicy: "stable"`: Verify invariance under event order permutation
* Test that invalid inputs throw appropriate error codes

## Text and Documentation Style

* Use `,` and `.` instead of `、` and `。` in Japanese
* Use direct form in Japanese (e.g., `~する` not `~します`)
* Follow markdownlint rules strictly(4space indent, asterisk for lists, etc. see, github/copilot-instructions.md)

## Git Commit Prefixes

* `feat:` - New features
* `fix:` - Bug fixes
* `refactor:` - Code refactoring including formatting and style
* `test:` - Adding or modifying tests
* `docs:` - Documentation changes
* `chore:` - Build process or tooling changes
