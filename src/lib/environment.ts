/** @format */

import {
    CdnEvent,
    fetchJavascriptAddOn,
    fetchLoadingGraph,
    fetchSource,
    fetchStyleSheets,
    getLoadingGraph,
    LoadingGraph,
    parseResourceId,
} from '@youwol/cdn-client'
import { forkJoin, from, Observable, of, ReplaySubject, Subject } from 'rxjs'
import { map } from 'rxjs/operators'
import {
    LoadingGraphSchema,
    ProjectSchema,
} from './flux-project/client-schemas'
import { Context, ErrorLog } from './models/context'
import { FluxPack, HostCommandRequest } from './models/models-base'
import { WorkerPool } from './worker-pool'

export function createObservableFromFetch(request, extractFct = (d) => d) {
    return Observable.create((observer) => {
        fetch(request)
            .then((response) => response.json()) // or text() or blob() etc.
            .then((data) => {
                observer.next(extractFct(data))
                observer.complete()
            })
            .catch((err) => observer.error(err))
    })
}

type IConsole = {
    log: (message?: any, ...optionalParams: any[]) => void
    warn: (message?: any, ...optionalParams: any[]) => void
    error: (message?: any, ...optionalParams: any[]) => void
}

export enum ProcessMessageKind {
    Scheduled = 'Scheduled',
    Started = 'Started',
    Canceled = 'Canceled',
    Failed = 'Failed',
    Succeeded = 'Succeeded',
    Log = 'Log',
}
export interface ProcessMessage {
    kind: ProcessMessageKind
    text: string
}

export class Process {
    public readonly messages$ = new Subject<ProcessMessage>()

    constructor(
        public readonly title: string,
        public readonly context?: Context,
    ) {}

    schedule(text = 'scheduled') {
        this.messages$.next({ kind: ProcessMessageKind.Scheduled, text: text })
    }
    start(text = 'Started') {
        this.messages$.next({ kind: ProcessMessageKind.Started, text: text })
    }
    cancel(text = 'Canceled') {
        this.messages$.next({ kind: ProcessMessageKind.Canceled, text: text })
        this.messages$.complete()
    }
    fail(text = 'Failed') {
        this.messages$.next({ kind: ProcessMessageKind.Failed, text: text })
        this.messages$.complete()
    }
    succeed(text = 'Succeeded') {
        this.messages$.next({ kind: ProcessMessageKind.Succeeded, text: text })
        this.messages$.complete()
    }
    log(text: string) {
        this.messages$.next({ kind: ProcessMessageKind.Log, text: text })
    }
}

export interface IEnvironment {
    console: IConsole

    errors$: Subject<ErrorLog>

    hostCommandRequest$: Subject<HostCommandRequest>

    processes$: ReplaySubject<Process>

    workerPool: WorkerPool

    fetchStyleSheets(
        resources: string | Array<string>,
    ): Observable<Array<HTMLLinkElement>>

    fetchJavascriptAddOn(
        resources: string | Array<string>,
        onEvent?: (CdnEvent) => void,
    ): Observable<{ assetName; assetId; url; src }[]>

    fetchLoadingGraph(
        loadingGraph: LoadingGraphSchema,
        onEvent?: (CdnEvent) => void,
    ): Observable<LoadingGraphSchema>

    fetchSources(
        sources: { name: string; assetId: string; url: string }[],
        onEvent?: (event: CdnEvent) => void,
    ): Observable<{ name; assetId; url; content }[]>

    getProject(projectId): Observable<ProjectSchema>

    postProject(projectId: string, project: ProjectSchema): Observable<void>

    getLoadingGraph({
        libraries,
    }: {
        libraries: { [key: string]: string }
    }): Observable<LoadingGraphSchema>

    exposeProcess({
        title,
        context,
    }: {
        title: string
        context?: Context
    }): Process
}

export class Environment implements IEnvironment {
    public readonly executingWindow: Window
    public readonly renderingWindow: Window

    public readonly errors$ = new ReplaySubject<ErrorLog>()
    public readonly hostCommandRequest$ = new Subject<HostCommandRequest>()
    public readonly processes$ = new ReplaySubject<Process>()

    public readonly console: IConsole

    public readonly workerPool: WorkerPool

    constructor(data: {
        executingWindow: Window
        renderingWindow: Window
        console?: Console
    }) {
        this.renderingWindow = data.renderingWindow
        this.executingWindow = data.executingWindow
        this.workerPool = new WorkerPool({ environment: this })
        this.console = data.console || console
    }

    fetchStyleSheets(
        resources: string | Array<string>,
    ): Observable<Array<HTMLLinkElement>> {
        return from(fetchStyleSheets(resources, this.renderingWindow))
    }

    fetchJavascriptAddOn(
        resources: string | Array<string>,
        onEvent?: (CdnEvent) => void,
    ): Observable<{ assetName; assetId; url; src }[]> {
        return from(
            fetchJavascriptAddOn(resources, this.executingWindow, onEvent),
        )
    }

    fetchLoadingGraph(
        loadingGraph: LoadingGraph,
        onEvent?: (CdnEvent) => void,
    ): Observable<LoadingGraphSchema> {
        return from(
            fetchLoadingGraph(
                loadingGraph,
                this.executingWindow,
                undefined,
                onEvent,
            ),
        ).pipe(map(() => loadingGraph))
    }

    fetchSources(
        sources: { name: string; assetId: string; url: string }[],
        onEvent?: (event: CdnEvent) => void,
    ): Observable<{ name; assetId; url; content }[]> {
        const promises = sources.map(({ name, assetId, url }) =>
            fetchSource({ name, url, onEvent }),
        )
        return forkJoin(promises)
    }

    getProject(projectId): Observable<ProjectSchema> {
        const url = `/api/assets-gateway/flux-backend/projects/${projectId}`
        const request = new Request(url, { method: 'GET', headers: {} })
        return createObservableFromFetch(request)
    }

    postProject(projectId: string, project: ProjectSchema): Observable<void> {
        const url = `/api/assets-gateway/flux-backend/projects/${projectId}`
        const request = new Request(url, {
            method: 'POST',
            headers: { 'content-type': 'application/json' },
            body: JSON.stringify(project),
        })

        return createObservableFromFetch(request)
    }

    getLoadingGraph(body: {
        libraries: { [key: string]: string }
    }): Observable<LoadingGraphSchema> {
        return from(getLoadingGraph(body))
    }

    exposeProcess({
        title,
        context,
    }: {
        title: string
        context?: Context
    }): Process {
        const p = new Process(title, context)
        this.processes$.next(p)
        return p
    }
}

export type KeyLoadingGraphStore = {
    libraries: { [key: string]: string }
    using: { [key: string]: string }
}

export class MockEnvironment implements IEnvironment {
    css = new Array<string>()
    jsAddons = new Array<string>()
    savedProjects: { [key: string]: ProjectSchema } = {}

    public readonly projectsDB: { [key: string]: ProjectSchema }
    public readonly fluxPacksDB: { [key: string]: FluxPack }
    public readonly loadingGraphResponses: { [key: string]: LoadingGraphSchema }
    public readonly console: IConsole

    public readonly errors$ = new ReplaySubject<ErrorLog>()
    public readonly hostCommandRequest$ = new Subject<HostCommandRequest>()
    public readonly processes$ = new ReplaySubject<Process>()

    public readonly workerPool = undefined

    constructor(
        data: {
            projectsDB?: { [key: string]: ProjectSchema }
            fluxPacks?: Array<FluxPack>
            console?: IConsole
            loadingGraphResponses?: Array<
                [KeyLoadingGraphStore, LoadingGraphSchema]
            >
        } = {},
    ) {
        this.projectsDB = data.projectsDB || {}
        this.fluxPacksDB = data.fluxPacks
            ? data.fluxPacks.reduce(
                  (acc, e) => ({ ...acc, ...{ [e.name]: e } }),
                  {},
              )
            : {}
        this.loadingGraphResponses = data.loadingGraphResponses
            ? data.loadingGraphResponses.reduce(
                  (acc, [k, v]) => ({ ...acc, ...{ [JSON.stringify(k)]: v } }),
                  {},
              )
            : {}
        this.console = data.console || console
    }

    fetchStyleSheets(
        resources: string | Array<string>,
    ): Observable<Array<HTMLLinkElement>> {
        resources = Array.isArray(resources) ? resources : [resources]
        this.css = [...this.css, ...resources]
        return of(resources as unknown as Array<HTMLLinkElement>)
    }

    fetchJavascriptAddOn(
        resources: string | Array<string>,
    ): Observable<{ assetName; assetId; url; src }[]> {
        resources = Array.isArray(resources) ? resources : [resources]
        const parsed = resources.map((r) => parseResourceId(r))
        this.jsAddons = [...this.jsAddons, ...resources]
        return of(
            parsed.map(({ name, url, assetId }) => {
                return { assetName: name, assetId, url, src: '' }
            }),
        )
    }

    fetchLoadingGraph(
        loadingGraph: LoadingGraphSchema,
    ): Observable<LoadingGraphSchema> {
        loadingGraph.lock.forEach((resource) => {
            window[resource.name] = { pack: this.fluxPacksDB[resource.name] }
        })
        return of(loadingGraph)
    }

    fetchSources(
        sources: { name: string; assetId: string; url: string }[],
        onEvent?: (event: CdnEvent) => void,
    ): Observable<{ name; assetId; url; content }[]> {
        throw Error(`fetchSource not implemented in MockEnvironment`)
    }

    getProject(projectId: string): Observable<ProjectSchema> {
        if (!this.projectsDB[projectId]) {
            throw Error(`The project with id ${projectId} can not be found `)
        }
        return of(this.projectsDB[projectId])
    }

    postProject(projectId: string, project: ProjectSchema): Observable<void> {
        this.savedProjects[projectId] = project
        return of()
    }

    getLoadingGraph(
        body: KeyLoadingGraphStore,
    ): Observable<LoadingGraphSchema> {
        const key = JSON.stringify(body)
        if (!this.loadingGraphResponses[key]) {
            throw Error(
                `MockEnvironment.getLoadingGraph: loading graph not found for key: ${key}`,
            )
        }

        return of(this.loadingGraphResponses[key])
    }

    exposeProcess({
        title,
        context,
    }: {
        title: string
        context?: Context
    }): Process {
        throw Error(`exposeProcess not implemented in MockEnvironment`)
    }
}
