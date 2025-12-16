import type { PolarPoint, XyPoint } from "./index";

export function polarToXy(p: PolarPoint): XyPoint {
    return {
        x: p.r * Math.cos(p.thetaRad),
        y: p.r * Math.sin(p.thetaRad)
    };
}
