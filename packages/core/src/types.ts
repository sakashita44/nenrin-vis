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
}

export interface NenrinInput {
    config: NenrinConfig;
    events: Event[];
}
