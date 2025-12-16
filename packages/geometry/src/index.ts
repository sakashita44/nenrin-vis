export interface PolarAnchor {
    domainId: string;
    thetaRad: number;
    r: number;
}

export interface Ridge {
    stepIndex: number;
    anchors: PolarAnchor[];
}

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

export interface CurveAlgorithm<TCtx = undefined> {
    name: string;
    ridgeToPolarPolyline(ridge: Ridge, ctx: TCtx): PolarPoint[];
}

export interface GeometryOptions<TCtx = undefined> {
    output: "polar" | "xy";
    ctx?: TCtx;
    validateFinite?: boolean;
}

export function buildRidgePolylines(): never {
    throw new Error("Not implemented");
}
