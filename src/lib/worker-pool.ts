/** @format */

import { Observable, of, Subject } from 'rxjs'
import { filter, map, reduce, take, takeWhile, tap } from 'rxjs/operators'
import { IEnvironment, Process } from './environment'
import { Context } from './models/context'

function entryPointWorker(messageEvent: MessageEvent) {
    const message = messageEvent.data
    const workerScope: any = self
    if (message.type == 'Execute') {
        const context = {
            info: (text, json) => {
                workerScope.postMessage({
                    type: 'Log',
                    data: {
                        taskId: message.data.taskId,
                        workerId: message.data.workerId,
                        logLevel: 'info',
                        text,
                        json: json,
                    },
                })
            },
            sendData: (data) => {
                workerScope.postMessage({
                    type: 'Data',
                    data: {
                        ...data,
                        ...{ taskId: message.data.taskId },
                    },
                })
            },
        }

        const entryPoint = new Function(message.data.entryPoint)()

        workerScope.postMessage({
            type: 'Start',
            data: {
                taskId: message.data.taskId,
                workerId: message.data.workerId,
            },
        })
        try {
            const resultOrPromise = entryPoint({
                args: message.data.args,
                taskId: message.data.taskId,
                workerScope: workerScope,
                context,
            })
            if (resultOrPromise instanceof Promise) {
                resultOrPromise
                    .then((result) => {
                        workerScope.postMessage({
                            type: 'Exit',
                            data: {
                                taskId: message.data.taskId,
                                workerId: message.data.workerId,
                                error: false,
                                result: result,
                            },
                        })
                    })
                    .catch((error) => {
                        workerScope.postMessage({
                            type: 'Exit',
                            data: {
                                taskId: message.data.taskId,
                                workerId: message.data.workerId,
                                error: true,
                                result: error,
                            },
                        })
                    })
                return
            }
            const result = resultOrPromise
            workerScope.postMessage({
                type: 'Exit',
                data: {
                    taskId: message.data.taskId,
                    workerId: message.data.workerId,
                    error: false,
                    result: result,
                },
            })
        } catch (e) {
            workerScope.postMessage({
                type: 'Exit',
                data: {
                    taskId: message.data.taskId,
                    workerId: message.data.workerId,
                    error: true,
                    result: e,
                },
            })
            return
        }
    }
    if (message.type == 'installVariables') {
        message.data.forEach((d) => {
            workerScope[d.id] = d.value
        })
    }
    if (message.type == 'installFunctions') {
        message.data.forEach((d) => {
            workerScope[d.id] = new Function(d.target)()
        })
    }
    if (message.type == 'installScript') {
        //let GlobalScope = _GlobalScope ? _GlobalScope : self as any
        const GlobalScope = self
        const exports = {}
        if (!message.data.import) {
            workerScope.postMessage({
                type: 'Log',
                data: {
                    logLevel: 'info',
                    text: `Installing ${message.data.id} using default import`,
                },
            })
            new Function('document', 'exports', '__dirname', message.data.src)(
                GlobalScope,
                exports,
                '',
            )
        } else {
            workerScope.postMessage({
                type: 'Log',
                data: {
                    logLevel: 'info',
                    text: `Installing ${message.data.id} using provided import function: ${message.data.import}`,
                },
            })
            const importFunction = new Function(message.data.import)()
            importFunction(GlobalScope, message.data.src)
        }
        workerScope.postMessage({
            type: 'Log',
            data: {
                logLevel: 'info',
                text: `Installing ${message.data.id} using provided import function: ${message.data.import}`,
            },
        })

        if (message.data.sideEffects) {
            const sideEffectFunction = new Function(message.data.sideEffects)()
            const promise = sideEffectFunction(GlobalScope, exports)
            if (promise instanceof Promise) {
                promise.then(() => {
                    workerScope.postMessage({
                        type: 'DependencyInstalled',
                        data: {
                            id: message.data.id,
                        },
                    })
                })
            } else {
                workerScope.postMessage({
                    type: 'DependencyInstalled',
                    data: {
                        id: message.data.id,
                    },
                })
            }
        } else {
            workerScope.postMessage({
                type: 'DependencyInstalled',
                data: {
                    id: message.data.id,
                },
            })
        }
    }
}

type WorkerId = string

interface WorkerDependency {
    id: string
    src: string | HTMLScriptElement
    import?: (GlobalScope, src) => void
    sideEffects?: (globalScope, exports) => void
}

interface WorkerFunction<T> {
    id: string
    target: T
}

interface WorkerVariable<T> {
    id: string
    value: T
}

export interface WorkerContext {
    info: (text: string, data?: any) => void
    sendData: (data) => void
}

export class WorkerPool {
    poolSize = navigator.hardwareConcurrency - 2

    workers: { [key: string]: Worker } = {}
    channels$: { [key: string]: Subject<any> } = {}
    installedDependencies: { [key: string]: Array<string> } = {}

    tasksQueue: Array<{
        taskId: string
        targetWorkerId?: string
        args: unknown
        channel$: Subject<any>
        entryPoint: any
    }> = []
    runningTasks: Array<{ workerId: string; taskId: string }> = []
    busyWorkers: Array<string> = []

    dependencies: WorkerDependency[] = []
    functions: WorkerFunction<unknown>[] = []
    variables: WorkerVariable<unknown>[] = []

    workerReleased$ = new Subject<{ workerId: WorkerId; taskId: string }>()

    backgroundContext = new Context('background management', {})

    environment: IEnvironment

    constructor({ environment }: { environment: IEnvironment }) {
        this.environment = environment
        const subs = this.workerReleased$.subscribe(({ workerId, taskId }) => {
            this.busyWorkers = this.busyWorkers.filter((wId) => wId != workerId)
            this.runningTasks = this.runningTasks.filter(
                (task) => task.taskId != taskId,
            )

            this.pickTask(workerId, this.backgroundContext)
        })
    }

    schedule<TArgs = any>({
        title,
        entryPoint,
        args,
        targetWorkerId,
        context,
    }: {
        title: string
        entryPoint: ({
            args,
            taskId,
            context,
            workerScope,
        }: {
            args: TArgs
            taskId: string
            context: any
            workerScope: any
        }) => void
        args: TArgs
        targetWorkerId?: string
        context: Context
    }): Observable<any> {
        return context.withChild('schedule thread', (ctx) => {
            const taskId = `t${Math.floor(Math.random() * 1e6)}`
            const channel$ = new Subject()
            const p = this.environment.exposeProcess({
                title,
                context: ctx,
            })
            p.schedule()

            const r$ = this.instrumentChannel$(channel$, p, taskId, context)

            if (targetWorkerId && !this.workers[targetWorkerId]) {
                throw Error('Provided workerId not known')
            }
            if (targetWorkerId && this.workers[targetWorkerId]) {
                this.tasksQueue.push({
                    entryPoint,
                    args,
                    taskId,
                    channel$,
                    targetWorkerId,
                })

                if (!this.busyWorkers.includes(targetWorkerId)) {
                    this.pickTask(targetWorkerId, ctx)
                }

                return r$
            }
            const worker$ = this.getWorker$(ctx)
            if (!worker$) {
                this.tasksQueue.push({
                    entryPoint,
                    args,
                    taskId,
                    channel$,
                })
                return r$
            }
            worker$
                .pipe(
                    map(({ workerId, worker }) => {
                        ctx.info(`Got a worker ready ${workerId}`, {
                            installedDependencies:
                                this.installedDependencies[workerId],
                            requiredDependencies: this.dependencies.map(
                                (d) => d.id,
                            ),
                        })
                        this.tasksQueue.push({
                            entryPoint,
                            args,
                            taskId,
                            channel$,
                        })
                        this.pickTask(workerId, ctx)
                        return workerId
                    }),
                )
                .subscribe()

            return r$
        })
    }

    import({
        sources,
        functions,
        variables,
    }: {
        sources: WorkerDependency[]
        functions: WorkerFunction<unknown>[]
        variables: WorkerVariable<unknown>[]
    }) {
        this.dependencies = [...this.dependencies, ...sources]
        this.functions = [...this.functions, ...functions]
        this.variables = [...this.variables, ...variables]
        Object.values(this.workers).forEach((worker) =>
            this.installDependencies(worker, sources, functions, variables),
        )
    }

    installDependencies(worker, sources, functions, variables) {
        worker.postMessage({
            type: 'installVariables',
            data: variables,
        })

        const dataFcts = functions.map((fct) => ({
            id: fct.id,
            target: `return ${String(fct.target)}`,
        }))
        worker.postMessage({
            type: 'installFunctions',
            data: dataFcts,
        })

        sources.forEach((dependency) => {
            worker.postMessage({
                type: 'installScript',
                data: {
                    src: dependency.src,
                    id: dependency.id,
                    import: dependency.import
                        ? `return ${String(dependency.import)}`
                        : undefined,
                    sideEffects: dependency.sideEffects
                        ? `return ${String(dependency.sideEffects)}`
                        : undefined,
                },
            })
        })
    }

    instrumentChannel$(
        originalChannel$: Subject<any>,
        exposedProcess: Process,
        taskId: string,
        context: Context,
    ): Observable<any> {
        const channel$ = originalChannel$.pipe(
            takeWhile((message) => message['type'] != 'Exit', true),
        )

        channel$
            .pipe(
                filter((message: any) => message.type == 'Start'),
                take(1),
            )
            .subscribe((message) => {
                context.info('worker started', message)
                exposedProcess.start()
            })

        channel$
            .pipe(
                filter((message: any) => message.type == 'Exit'),
                take(1),
            )
            .subscribe((message) => {
                if (message.data.error) {
                    context.info('worker exited abnormally', message)
                    exposedProcess.fail(message.data.result)
                    return
                }
                exposedProcess.succeed()
                context.info('worker exited normally', message)
            })

        channel$
            .pipe(filter((message: any) => message.data.taskId != taskId))
            .subscribe((message: any) => {
                throw Error(
                    `Mismatch in taskId: expected ${taskId} but got from message ${message.data.taskId}`,
                )
            })

        channel$
            .pipe(filter((message: any) => message.type == 'Log'))
            .subscribe((message) => {
                exposedProcess.log(message.data.text)
                context.info(message.data.text, message.data.json)
            })

        return channel$.pipe(
            map((message) => {
                if (message['type'] == 'Exit' && message['data'].error) {
                    throw Error(String(message['data'].result))
                }
                return message
            }),
        )
    }

    getWorker$(
        context: Context,
    ): Observable<{ workerId: string; worker: Worker }> {
        return context.withChild('get worker', (ctx) => {
            const idleWorkerId = Object.keys(this.workers).find(
                (workerId) => !this.busyWorkers.includes(workerId),
            )

            if (idleWorkerId) {
                ctx.info(`return idle worker ${idleWorkerId}`)
                return of({
                    workerId: idleWorkerId,
                    worker: this.workers[idleWorkerId],
                })
            }
            if (Object.keys(this.workers).length < this.poolSize) {
                return this.createWorker$(ctx)
            }
            return undefined
        })
    }

    createWorker$(
        context: Context,
    ): Observable<{ workerId: string; worker: Worker }> {
        return context.withChild('create worker', (ctx) => {
            const workerId = `w${Math.floor(Math.random() * 1e6)}`
            ctx.info(`Create worker ${workerId}`, {
                requiredDependencies: this.dependencies.map((d) => d.id),
            })

            this.channels$[workerId] = new Subject()

            const blob = new Blob(
                ['self.onmessage = ', entryPointWorker.toString()],
                { type: 'text/javascript' },
            )
            const url = URL.createObjectURL(blob)
            const worker = new Worker(url)
            this.installedDependencies[workerId] = []

            worker.onmessage = ({ data }) => {
                if (data.type == 'DependencyInstalled') {
                    this.installedDependencies[workerId].push(data.id)
                    this.channels$[workerId].next(data)
                }
            }

            this.installDependencies(
                worker,
                this.dependencies,
                this.functions,
                this.variables,
            )

            const dependencyCount = Object.keys(this.dependencies).length
            if (dependencyCount == 0) {
                ctx.info('No dependencies to load: worker ready', {
                    workerId: workerId,
                    worker,
                })
                return of({ workerId, worker })
            }
            const r$ = this.channels$[workerId].pipe(
                filter((message) => message.type == 'DependencyInstalled'),
                take(dependencyCount),
                reduce((acc, e) => {
                    return acc.concat(e)
                }, []),
                map(() => worker),
                tap(() => (this.workers[workerId] = worker)),
                map((worker) => {
                    return { workerId, worker }
                }),
            )
            return r$
        })
    }

    /**
     * Start a worker with first task in its queue
     */
    pickTask(workerId: string, context: Context) {
        context.withChild('pickTask', (ctx) => {
            if (
                this.tasksQueue.filter(
                    (task) =>
                        task.targetWorkerId == undefined ||
                        task.targetWorkerId == workerId,
                ).length == 0
            ) {
                return
            }
            this.busyWorkers.push(workerId)
            const { taskId, entryPoint, args, channel$ } = this.tasksQueue.find(
                (t) =>
                    t.targetWorkerId ? t.targetWorkerId === workerId : true,
            )

            this.tasksQueue = this.tasksQueue.filter((t) => t.taskId != taskId)

            this.runningTasks.push({ workerId, taskId })
            const worker = this.workers[workerId]

            channel$
                .pipe(
                    filter((message) => {
                        return message.type == 'Exit'
                    }),
                )
                .subscribe((message) => {
                    this.workerReleased$.next({
                        taskId: message.data.taskId,
                        workerId,
                    })
                })
            worker.onmessage = ({ data }) => {
                if (data.data.taskId == taskId) {
                    channel$.next(data)
                }
            }

            ctx.info('picked task', {
                taskId,
                worker,
                entryPoint: String(entryPoint),
            })
            worker.postMessage({
                type: 'Execute',
                data: {
                    taskId,
                    workerId,
                    args,
                    entryPoint: `return ${String(entryPoint)}`,
                },
            })
        })
    }
}
