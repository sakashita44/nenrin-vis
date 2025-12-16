export type {
    CurveAlgorithm,
    GeometryOptions,
    PolarAnchor,
    PolarPoint,
    Ridge,
    RidgePolylinePolar,
    RidgePolylineXy,
    XyPoint
} from "@nenrin/types";

export { polarToXy } from "./xy";

export function buildRidgePolylines(): never {
    throw new Error("Not implemented");
}
