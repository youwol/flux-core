import { ReplaySubject, Subject } from "rxjs"
import { ExpectationStatus } from "./contract"
import * as _ from 'lodash'
import { uuidv4 } from "./models-base"

export class Log{

    public readonly timestamp = performance.now()
    public readonly id = uuidv4()

    constructor(
        public readonly context:Context,
        public readonly text:string,
        public readonly data: unknown){
    }
}

export class ErrorLog<TError extends Error = any, TData=unknown> extends Log{
    constructor(context:Context, public readonly error: TError, data: TData,){
        super(context, error.message, data)
    }
}

export class WarningLog extends Log{
    constructor(context:Context, public readonly text: string, data: unknown){
        super(context, text, data)
    }
}

export class InfoLog extends Log{
    constructor(context:Context, public readonly text: string, data: unknown){
        super(context, text, data)
    }
}


export class CustomLog<T> extends Log{


    constructor(
        context:Context,
        text: string, 
        data: T,
        public readonly divCreator : (d:T) => HTMLDivElement 
        ){
        super(context, text, data)
    }
}

export class LogChannel<T=unknown>{

    filter: (data: Log) => boolean
    map: (data: Log) => T
    pipes: Array<Subject<T>>

    constructor( { filter, map, pipes }:
        {
            filter: (data: Log) => boolean,
            map?: (data: Log) => T,
            pipes: Array<Subject<T>>
        }){

        this.filter = filter
        this.map = map == undefined ? (d) => (d as unknown as T) : map
        this.pipes = pipes
    }

    dispatch( log: Log) {

        if( this.filter(log))
            this.pipes.forEach( (pipe) => {
                pipe.next(this.map(log))
            })
    }
}

export enum ContextStatus{

    SUCCESS = 'success',
    RUNNING = 'running',
    FAILED = 'failed'
}
export class Context{

    children = new Array<Context | Log>()
    id = uuidv4()

    public readonly startTimestamp = performance.now()

    private endTimestamp: number

    constructor(
        public readonly title: string, 
        public userContext: {[key:string]: unknown},
        public readonly channels$: Array<LogChannel> = [],
        public readonly parent = undefined){
    }

    startChild(title: string, withUserInfo: {[key:string]: unknown} = {}): Context{

        return new Context(title, {...this.userContext, ...withUserInfo}, this.channels$, this )
    }

    withChild<T>(title: string, callback: (context: Context) => T, withUserInfo: {[key:string]: unknown} = {}) : T {

        let childContext = new Context(title, {...this.userContext, ...withUserInfo}, this.channels$, this )
        this.children.push(childContext)
        try{
            let result = callback(childContext) 
            childContext.end()
            return result
        }
        catch(error){
            childContext.error(error, error.data || error.status)
            childContext.end()
            throw(error)
        }
    }

    root(): Context {
        return this.parent ? this.parent.root() : this
    }

    error(error: Error, data?: unknown){
        this.addLog(new ErrorLog(this, error, data ))
    }

    warning(text: string, data: unknown){
        this.addLog(new WarningLog(this, text, data ))
    }

    info(text: string, data: unknown){
        this.addLog(new InfoLog(this, text, data ))
    }

    end(){
        this.endTimestamp = performance.now()
    }

    elapsed(from?: number): number | undefined{

        from = from || this.startTimestamp

        let getElapsedRec = (from: number, current: Context) => {
            if(current.endTimestamp)
                return current.endTimestamp - from
            let maxi = current.children
            .map( (child: Context | Log ) =>{
                return child instanceof Context 
                    ? child.elapsed(from)
                    : child.timestamp - from 
            })
            .filter( elapsed => elapsed != undefined)
            .reduce( (acc,e) => e > acc ? e : acc , -1)
            return maxi == -1? undefined : maxi
        }
        return getElapsedRec(from, this)
    }

    status() : ContextStatus {

        let isErrorRec = (ctx: Context) => {
            return ctx.children.find( (child) => child instanceof ErrorLog) != undefined ||
                ctx.children
                .filter( child => child instanceof Context)
                .find( (child: Context) => isErrorRec(child)) != undefined
        }

        if(isErrorRec(this))
            return ContextStatus.FAILED

        if(this.endTimestamp!=undefined)
            return ContextStatus.SUCCESS

        return ContextStatus.RUNNING
    }

    private addLog( log: Log) {
        this.children.push(log)
        this.channels$.forEach(
            channel => channel.dispatch(log)
        ) 
    }
}

/**
 * A journal's widget allows to render complex data structures and interact with them from a UI.
 * 
 * It is an association between a test function returning whether or not  
 * a data structure can be rendered and a view (HTMLElement) generator.
 * 
 * @param TData Allows to provide strong typings for the data accepted by the function [[view]].
 * Depending on the condition defined by [[isCompatible]] it may not always be more specific
 * than *any*.
 */
export class JournalWidget<TData = any>{

    /**
     * @param isCompatible a function that takes as argument a data end returns
     * true if the view can be constructed from it 
     * @param view a view constructor
     */
    constructor(
        public readonly isCompatible: (data: any) => boolean,
        public readonly view: (data: TData) => HTMLElement
    ){}
}

/**
 * The Journal class encapsulates the required data to render a [[Context]] 
 * (and its children) in an HTML document.
 * 
 */
export class Journal{

    /**
     * The entry point: the journal render this context and all of its children
     */
    entryPoint: Context

    /**
     * title of the journal
     */
    title: string

    /**
     * Registered widgets that are used to render the *data* property of
     * a [[Log]] if possible (if the function [[JournalWidget.isCompatible]] apply 
     * to this *data* return true).
     */
    static widgets : Array<JournalWidget> = []

    /**
     * 
     * @param title see [[title]]
     * @param entryPoint see [[entryPoint]]
     */
    constructor({
        title,
        entryPoint
    }:{
        title: string,
        entryPoint: Context
    }){
        this.entryPoint = entryPoint
        this.title = title
    }
}