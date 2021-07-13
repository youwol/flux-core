
import { Observable, of, ReplaySubject, Subject } from "rxjs"
import { filter, map, reduce, switchMap, take, takeUntil, takeWhile, tap } from "rxjs/operators"
import { Context } from "./models/context"


function entryPointWorker(messageEvent: MessageEvent){
    let message = messageEvent.data
    console.log("Execute action in worker", message)
    let workerScope : any = self
    if(message.type == "Execute"){

        let context = {
            info: (text, json) => {
                workerScope.postMessage({  
                    type:"Log" , 
                    data: {
                        taskId: message.data.taskId,
                        workerId: message.data.workerId,
                        logLevel: "info",
                        text,
                        json: json
                    }
                })
            }
        }
        
        let entryPoint = new Function(message.data.entryPoint)()
        
        workerScope.postMessage({  
            type:"Start" , 
            data: {
                taskId: message.data.taskId,
                workerId: message.data.workerId,
            }
        })
        try{
            let result = entryPoint( {
                args: message.data.args, 
                taskId: message.data.taskId,
                workerScope: workerScope,
                context
            }) 
            workerScope.postMessage({  
                type:"Exit" , 
                data: {
                    taskId: message.data.taskId,
                    workerId: message.data.workerId,
                    error: false,
                    result: result
                }
            })
        }
        catch(e){
            console.error(e)
            workerScope.postMessage({  
                type:"Exit" , 
                data: {
                    taskId: message.data.taskId,
                    workerId: message.data.workerId,
                    error: true,
                    result: e
                }
            })
            return 
        }
    }
    if(message.type == "installFunctions"){ 
        console.log("Install functions", message)
        message.data.forEach( d => {
            workerScope[d.id] = new Function(d.target)()
        })
    }
    if(message.type == "installScript"){
        //let GlobalScope = _GlobalScope ? _GlobalScope : self as any
        let GlobalScope = self
        var exports = {}
        console.log(`Installing ${message.data.scriptId}`, message)
        if(!message.data.import){
            console.log(`Installing ${message.data.scriptId} using default import`)
            workerScope.postMessage({  
                type:"Log" , 
                data: {
                    logLevel: "info",
                    text: `Installing ${message.data.scriptId} using default import`
                }
            }) 
            new Function('document','exports','__dirname', message.data.src )( GlobalScope, exports, "")
            console.log("exports", exports)
        }
        else{
            workerScope.postMessage({  
                type:"Log" , 
                data: {
                    logLevel: "info",
                    text: `Installing ${message.data.scriptId} using provided import function: ${message.data.import}`
                }
            })
            let importFunction = new Function(message.data.import)()
            importFunction(GlobalScope, message.data.src)
        }
        workerScope.postMessage({  
            type:"Log" , 
            data: {
                logLevel: "info",
                text: `Installing ${message.data.scriptId} using provided import function: ${message.data.import}`
            }
        }) 

        if(message.data.sideEffects){
            let sideEffectFunction = new Function(message.data.sideEffects)()
            let promise = sideEffectFunction(GlobalScope, exports)
            promise.then( () => {
                workerScope.postMessage({  
                    type:"DependencyInstalled" , 
                    data: {
                        scriptId: message.data.scriptId
                    }
                })
            })
        }else{
            workerScope.postMessage({  
                type:"DependencyInstalled" , 
                data: {
                    scriptId: message.data.scriptId
                }
            })
        }
    }
}

type WorkerId = string

interface WorkerDependency{
    id: string
    src: string | HTMLScriptElement
    import?: (GlobalScope, src) => void,
    sideEffects?: (globalScope, exports) => void
}
interface WorkerFunction<T>{
    id: string
    target: T
}

export class WorkerPool{

    poolSize = navigator.hardwareConcurrency-2

    workers : {[key:string]: Worker}= {}
    channels$ : {[key:string]: Subject<any> } = {}

    tasksQueue : {[key:string]: Array<{taskId:string, args: unknown, channel$: Subject<any>, entryPoint: any}>}= {}
    runningTasks: Array<{workerId: string, taskId:string}>= []
    busyWorkers : Array<string> = []

    dependencies : WorkerDependency[] = []
    functions : WorkerFunction<unknown>[] = []

    workerReleased$ = new Subject<{workerId:WorkerId, taskId: string}>()

    backgroundContext = new Context("background management", {})

    constructor(){
        let subs = this.workerReleased$.subscribe( ({workerId, taskId}) => {

            this.busyWorkers = this.busyWorkers.filter( (wId) => wId!=workerId)
            this.runningTasks = this.runningTasks.filter( (task) => task.taskId != taskId)
            this.pickTask(workerId, this.backgroundContext)
        })
    }


    schedule<TArgs=any>({title, entryPoint, args, targetWorkerId, context}: { 
        title: string,
        entryPoint: ({ args, taskId, context, workerScope }:{ args:TArgs, taskId: string, context: any, workerScope: any }) => void,
        args: TArgs,
        targetWorkerId?: string,
        context: Context
    } ): Observable<any> {

        return context.withChild( "schedule thread", (ctx) => {
            
            let taskId = `t${Math.floor(Math.random()*1e6)}`
            let channel$ = new Subject()
            let r$ = this.instrumentChannel$(channel$, taskId, context)            

            console.log(`WORKER POOL: ###### Schedule ${title} with ${taskId} ######` )

            if( targetWorkerId && !this.workers[targetWorkerId]){
                throw Error("Provided workerId not known")
            }
            if(targetWorkerId && this.workers[targetWorkerId]){
                this.tasksQueue[targetWorkerId].push( 
                    {
                        entryPoint,
                        args,
                        taskId,
                        channel$
                    }
                )

                if( !this.busyWorkers.includes(targetWorkerId)){
                    this.pickTask(targetWorkerId, ctx)
                }
                
                return r$
            }
            let {workerId, worker$} = this.getWorker$(ctx)
            worker$.pipe(
                map( (worker) => {
                    ctx.info("Got a worker ready")
                    this.tasksQueue[workerId].push( 
                        {
                            entryPoint,
                            args,
                            taskId,
                            channel$
                        }
                    )
                    this.pickTask(workerId, ctx)
                    return workerId
                }))
            .subscribe()
            
            return r$
        })
        
    }

    import( {sources, functions} : { 
        sources: WorkerDependency[],
        functions: WorkerFunction<unknown>[]
    }){
        this.dependencies = [...this.dependencies, ...sources]
        this.functions = [...this.functions, ...functions]
        Object.values(this.workers).forEach( (worker) => 
        this.installDependencies(worker, sources, functions) )
    }

    installDependencies(worker, sources, functions){

        sources.forEach( (dependency) => {
            worker.postMessage({
                type: "installScript",
                data:{
                    src:dependency.src,
                    scriptId: dependency.id,
                    import: dependency.import ? `return ${String(dependency.import)}` : undefined,
                    sideEffects: dependency.sideEffects ? `return ${String(dependency.sideEffects)}` : undefined
                }
            })
        })
        let dataFcts = functions.map( (fct) => ({id: fct.id, target: `return ${String(fct.target)}`}))
        worker.postMessage({
            type: "installFunctions",
            data:dataFcts
        })
        
    }

    instrumentChannel$( channel$: Subject<any>, taskId: string, context: Context): Observable<any>{

        channel$.pipe(
            filter( (message:any) => message.type == "Start"),
            take(1)
        ).subscribe( (message) => {
            context.info("worker started", message)
        })
        channel$.pipe(
            filter( (message:any) => message.type == "Exit"),
            take(1)
        ).subscribe( (message) => {
            message.data.error 
                ? context.info("worker exited abnormally", message)
                : context.info("worker exited normally", message)
        })

        channel$.pipe(
            tap( (message: any) =>  {
                if(message.data.taskId != taskId)
                    throw Error(`Mismatch in taskId: expected ${taskId} but got from message ${message.data.taskId}`)
                console.log(`WORKER POOL: Got forwarded message`, message)
            }),
            filter( (message:any) => { 
                return message.type == "Log"
            })
        ).subscribe( (message) => {
            context.info(message.data.text, message.data.json)
        })

        return channel$.pipe( 
            takeWhile( message => message['type'] != 'Exit', true),
            map( message => {
                if( message['type'] == 'Exit' && message['data'].error )
                    throw Error(String(message['data'].result))
                return message
            })
        )
    }


    getWorker$(context: Context) : {workerId: string, worker$: Observable<Worker> } {

        return context.withChild("get worker", (ctx) => {
            
            let idleWorkerId = Object.keys(this.workers).find( workerId => !this.busyWorkers.includes(workerId) )

            if(idleWorkerId){
                ctx.info("return idle worker")
                return { workerId: idleWorkerId, worker$: of(this.workers[idleWorkerId])}
            }
            if(Object.keys(this.workers).length < this.poolSize){

                return this.createWorker$(ctx)
            }
        })
    }

    createWorker$(context: Context):{workerId: string, worker$: Observable<Worker> }{

        return context.withChild("create worker", (ctx) => {
            
            let workerId = `w${Math.floor(Math.random()*1e6)}` 
            this.channels$[workerId] = new Subject()
            this.tasksQueue[workerId] = []

            var blob = new Blob(['self.onmessage = ', entryPointWorker.toString()], { type: 'text/javascript' });
            var url = URL.createObjectURL(blob);
            let worker = new Worker(url)

            worker.onmessage = ({data}) => {
                if(data.type == "DependencyInstalled"){
                    console.log(`WORKER POOL #${workerId}: Dependency installed`)
                    this.channels$[workerId].next(data) 
                }
            }

            this.workers[workerId] = worker
            this.installDependencies(worker, this.dependencies, this.functions)

            let dependencyCount = Object.keys(this.dependencies).length
            if( dependencyCount == 0 ){
                ctx.info("No dependencies to load: worker ready",{workerId: workerId, worker})
                return { workerId, worker$: of(worker) }
            }
            let worker$ = this.channels$[workerId].pipe(
                filter( (message) => message.type == "DependencyInstalled"),
                take(dependencyCount),
                reduce( (acc,e) => { acc.concat[e]}, []),
                map( () => worker )
            )
            return {workerId, worker$}
        })
    }

    /**
     * Start a worker with first task in its queue
     */
    pickTask(workerId: string, context: Context) {

        context.withChild("pickTask", (ctx) => {

            if(this.tasksQueue[workerId].length == 0 ){
                ctx.info("No task to pick")
                return
            }
            this.busyWorkers.push(workerId)
            let {taskId, entryPoint, args, channel$} = this.tasksQueue[workerId][0]
            this.tasksQueue[workerId].shift()
            this.runningTasks.push({workerId, taskId})
            let worker = this.workers[workerId]
            
            channel$.pipe(
                filter( (message) => { 
                    return message.type == "Exit"
                })
            ).subscribe( (message) => {
                this.workerReleased$.next({taskId:message.data.taskId, workerId})
            })
            worker.onmessage = ({ data }) => {
                console.log(`WORKER POOL #${workerId} #${taskId}: Got a message`, data)
                if(data.data.taskId == taskId)
                    channel$.next(data)
            }

            ctx.info("picked task",{taskId, worker, entryPoint: String(entryPoint)}  )
            worker.postMessage({
                type:"Execute",
                data:{
                    taskId,
                    workerId,
                    args,
                    entryPoint: `return ${String(entryPoint)}`
                }
            })
        })
    }
}