/** @format */

import { ModuleFlux } from '../models/models-base'

type Adaptor = any

export class ConnectionStart {
    constructor(
        public readonly module: ModuleFlux,
        public readonly outputSlot,
    ) {}
}
export class ConnectionEnd {
    constructor(
        public readonly module: ModuleFlux,
        public readonly inputSlot,
        public readonly adaptor: Adaptor,
    ) {}
}
export class Step {
    constructor(
        public readonly module,
        public readonly inputSlot,
        public readonly outputSlot,
        public readonly adaptor,
        public readonly externalObservers,
    ) {}
}

export class Branch {
    readonly starts: Array<ConnectionStart>
    readonly ends: Array<ConnectionEnd>
    readonly observers: Array<any>
    readonly modules: Array<ModuleFlux>

    constructor(...steps: Array<Step>) {
        this.starts = steps
            .slice(0, -1)
            .map((step) => new ConnectionStart(step.module, step.outputSlot))
        this.ends = steps
            .slice(1)
            .map(
                (step) =>
                    new ConnectionEnd(
                        step.module,
                        step.inputSlot,
                        step.adaptor,
                    ),
            )
        this.observers = steps
            .map((step: any) => step.externalObservers)
            .filter((d) => d != undefined)
        this.modules = steps.map((step) => step.module)
    }
}

export namespace Branch {
    export type ExplicitConnect = [ModuleFlux, string, string]
}
