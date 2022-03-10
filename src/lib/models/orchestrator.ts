/** @format */

import { merge, Observable, ReplaySubject, Subject } from 'rxjs'
import { ModuleFlux } from './models-base'

export class StaticStorage {
    static defaultStorage = new StaticStorage('default', undefined);
    [key: string]: any

    public readonly parentStorage: StaticStorage

    constructor(public readonly __storageId: string, parentStorage) {
        this.parentStorage == undefined
            ? (this.parentStorage = StaticStorage.defaultStorage)
            : parentStorage
    }

    of<T>(type: string): Map<string, T> {
        if (!this[type]) {
            this[type] = new Map<string, T>()
        }

        return this[type]
    }

    has<T>(type: string, id: string): boolean {
        return this.of<T>(type).get(id)
            ? true
            : this.parentStorage
            ? this.parentStorage.has<T>(type, id)
            : false
    }

    addListener(type: string, id: string) {
        this.of(type).set(id, new ReplaySubject<ModuleFlux>(1))
        if (this.parentStorage) {
            this.of(type).set(id, new ReplaySubject<ModuleFlux>(1))
        }
    }

    listener<T>(type: string, id: string): Observable<T> {
        const subjects = this.__get(type, id).filter((d) => d)
        return merge(...subjects)
    }
    __get(type, id) {
        return [this.of(type).get(id)].concat(
            this.parentStorage ? this.parentStorage.__get(type, id) : [],
        )
    }
}

export class Orchestrator extends ModuleFlux {
    staticStorage: StaticStorage
    type: string
    id: string
    constructor(params) {
        super(params)

        this.staticStorage =
            params.staticStorage || StaticStorage.defaultStorage
        this.type = params.typeName
        this.id = params.id
    }

    registerOrchestrator() {
        if (!this.staticStorage.of(this.type).get(this.id)) {
            this.staticStorage
                .of(this.type)
                .set(this.id, new ReplaySubject<ModuleFlux>(1))
        }

        this.staticStorage
            .of<Subject<Orchestrator>>(this.type)
            .get(this.id)
            .next(this)
    }

    static get$<T2>(
        typeName,
        staticStorage: StaticStorage,
        id: string,
    ): Observable<T2> {
        if (!staticStorage.has(typeName, id)) {
            staticStorage.addListener(typeName, id)
        }

        return staticStorage.listener<T2>(typeName, id)
    }
}
