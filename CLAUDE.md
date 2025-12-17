# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

nenrin-vis is a TypeScript library for visualizing accumulation of activities on polar coordinates, similar to tree rings. It transforms activity data into a generative tree-ring-like visualization where accumulated activity determines radial growth rather than time progression.

Key concept: Activity density is visualized as "thickness" on polar coordinates, where periods with no activity are compressed and dense periods appear as thick layers.

## Repository Structure

This is a pnpm monorepo with the following packages:

* `packages/types/`: Shared TypeScript type definitions for all packages. Provides the contract between packages
* `packages/core/`: Zero-dependency core computation layer. Aggregates input events and generates ridge `anchors` (polar coordinates)
* `packages/geometry/`: Zero-dependency geometry layer. Converts `anchors` to drawable point sequences (polylines) with injectable curve interpolation algorithms
* `packages/dots/`: Zero-dependency dots layer. Generates event dots with injectable placement algorithms

Planned packages (not yet implemented):

* `@nenrin/geometry-algorithms-d3`: Curve interpolation algorithms using d3-shape
* `@nenrin/renderer-canvas`: Reference Canvas renderer implementation

## Package Architecture

### Package Boundaries

Each package has clearly defined responsibilities (see `docs/Policy.md`):

* **@nenrin/types**: Shared TypeScript type definitions. **Type-only package with no runtime values.** Provides the interface contract between packages. Zero dependencies. Allows packages like `@nenrin/geometry` to be used independently without `@nenrin/core`. Important: Only exports types, never values or functions
* **@nenrin/core**: Aggregates `events` by `(stepIndex, domainId)`, generates ridge `anchors` using `vmin` and `growthPerActivity`. Depends only on `@nenrin/types`. Does NOT handle curve interpolation, sampling, or rendering
* **@nenrin/geometry**: Converts Core's `anchors` to polylines (point sequences) for rendering. Curve interpolation algorithms are injectable. Depends only on `@nenrin/types`. Does NOT handle UI, innerRadius, zoom/pan, or hit testing
* **@nenrin/dots**: Generates event dots with injectable placement algorithms. Depends only on `@nenrin/types`. Does NOT handle Macro/Micro determination or pixel-based hit testing

All packages (except `@nenrin/types`) maintain zero runtime dependencies beyond the shared types package. External dependencies (like d3-shape) are isolated to separate packages.

### @nenrin/types Package Policy

**Critical**: `@nenrin/types` is a type-only package with strict rules:

1. **Type-only exports**: Only export TypeScript types, interfaces, and type aliases. Never export values, functions, or classes
2. **No runtime code**: Must not contain any runtime logic or implementation. The built output should contain no executable code
3. **Zero dependencies**: Must not depend on any packages (not even other `@nenrin/*` packages)
4. **No duplication**: Type definitions must not be duplicated across packages. If a type is shared, it belongs in `@nenrin/types`
5. **Pure data contracts**: Only contains interface definitions that describe data structures passed between packages

**Rationale**: This ensures `@nenrin/types` has zero runtime cost and allows packages to depend on it without creating runtime coupling. It also prevents circular dependencies and allows independent package usage (e.g., using `@nenrin/geometry` without `@nenrin/core`).

**Re-exports**: Other packages may re-export types from `@nenrin/types` for user convenience, but the canonical source is always `@nenrin/types`.

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

1. Input: `events` array with `{stepIndex, domainId, weight?, metadata?, eventKey?, isKnot?}`
2. Core: Aggregates events and generates `anchors` for each ridge
3. Geometry: Converts `anchors` to drawable `points` using injectable curve algorithm
4. Dots: Generates dot positions from events and ridges using injectable placement algorithm
5. Renderer: Draws polylines and dots on Canvas/SVG (not in this repo yet)

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
* `docs/progress/`: Progress tracking documents (see below)

## Progress Tracking

**CRITICAL**: Track implementation progress in `docs/progress/` documents. **Always update after any implementation work**.

### Current tracking document

* `docs/progress/v1-0.md`: v1.0 milestone and implementation status for each package

### Update policy

Always update `docs/progress/v1-0.md` at these moments:

1. **Package implementation progress**: When functions or modules are implemented, update the corresponding checkboxes to `[x]`
2. **Phase transitions**: When completing a Phase, update the "Current Status" section
3. **Blocker discovery**: When finding issues that block implementation, add them to the "Blockers" section
4. **New task discovery**: When additional work is identified during implementation, add it to the package's "Remaining Work" list
5. **Completion criteria met**: When Phase completion criteria are satisfied, update the milestone status

### Visibility principle

Progress documents serve as the "Single Source of Truth" for development. Keeping implementation status up-to-date provides:

* Clear visibility on what to do next
* Visual distinction between completed and pending work
* Easy tracking of overall project progress
* Prevention of duplicate or missed work

**Important**: Updating progress documents is a mandatory task, equal in importance to implementation work. Never postpone updates.

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
