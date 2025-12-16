export type {
    Domain,
    Event,
    NenrinConfig,
    NenrinInput,
    PolarAnchor,
    PolarPoint,
    Ridge,
    XyPoint
} from "@nenrin/types";

export interface NenrinDot {
    stepIndex: number;
    domainId: string;
    eventIndex: number;
    position: import("@nenrin/types").PolarPoint | import("@nenrin/types").XyPoint;
}

export interface NenrinKnot {
    stepIndex: number;
    domainId: string;
    eventIndex: number;
    position: import("@nenrin/types").PolarPoint | import("@nenrin/types").XyPoint;
}

export interface DotsOutput {
    dots: NenrinDot[];
    knots?: NenrinKnot[];
}

export interface DotPlacementContext {
    events: import("@nenrin/types").Event[];
    ridges: import("@nenrin/types").Ridge[];
    domainIds: string[];
    domainAnglesRad: number[];
}

export interface DotPlacementAlgorithm {
    name: string;
    buildDots(ctx: DotPlacementContext): NenrinDot[];
}

export interface DotsOptions {
    output: "polar" | "xy";
    bandPaddingR?: number;
}

export function buildDots(): never {
    throw new Error("Not implemented");
}
