export interface NenrinConfig {
    vmin: number;
    growthPerActivity: number;
    domains: Domain[];
}

export interface Domain {
    id: string;
    label: string;
    angleRad: number;
}

export interface Event {
    stepIndex: number;
    domainId: string;
    weight?: number;
    metadata?: unknown;
    eventKey?: string;
    isKnot?: boolean;
}

export interface NenrinInput {
    config: NenrinConfig;
    events: Event[];
}

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
