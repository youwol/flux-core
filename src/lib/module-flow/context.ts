import { ReplaySubject } from "rxjs"
import { ExpectationStatus } from "./contract"
import * as _ from 'lodash'

export class Log{

    public readonly timestamp = Date.now()

    constructor(public readonly text:string){
    }
}

export class ErrorLog extends Log{
    constructor(public readonly error: Error, public readonly data: unknown,){
        super(error.message)
    }
}

export class WarningLog extends Log{
    constructor(public readonly text: string, public readonly data: unknown){
        super(text)
    }
}

export class InfoLog extends Log{
    constructor(public readonly text: string, public readonly data: unknown){
        super(text)
    }
}

export class ExpectationLog extends Log{
    constructor(public readonly text: string, public readonly status: ExpectationStatus<unknown>){
        super(text)
    }
}

export class OutputLog extends Log{
    constructor(public readonly text: string, public readonly data: unknown){
        super(text)
    }
}


export class CustomLog<T> extends Log{


    constructor(
        public readonly text: string, 
        public readonly data: T,
        public readonly divCreator : (d:T) => HTMLDivElement 
        ){
        super(text)
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


export class Context{

    children = new Array<Context>()
    logs = new Array<Log>()

    public readonly startTimestamp = Date.now()

    private endTimestamp: number

    constructor(
        public readonly title: string, 
        public userContext: {[key:string]: unknown},
        public readonly channels$: Array<LogChannel> = [],
    }

    startChild(title: string, withUserInfo: {[key:string]: unknown} = {}): Context{

        return new Context(title, {...this.userContext, ...withUserInfo}, this.logs$ )
    }

    withChild<T>(title: string, callback: (context: Context) => T, withUserInfo: {[key:string]: unknown} = {}) : T {

        let childContext = new Context(title, {...this.userContext, ...withUserInfo}, this.logs$ )
        this.children.push(childContext)
        try{
            let result = callback(childContext) 
            childContext.end()
            return result
        }
        catch(error){
            childContext.error(error)
            throw(error)
        }
    }

    error(error: Error, data?: unknown){
        this.addLog(new ErrorLog(error, data ))
    }

    warning(text: string, data: unknown){
        this.addLog(new WarningLog(text, data ))
    }

    info(text: string, data: unknown){
        this.logs.push(new InfoLog(text, data ))
    }

    expectation(text: string, status: ExpectationStatus<unknown>){
        this.addLog(new ExpectationLog(text, status ))
    }

    output(text: string, data: unknown){
        this.addLog(new OutputLog(text, status))
    }

    end(){
        this.endTimestamp = Date.now()
    }

    elapsed(){
        return this.endTimestamp - this.startTimestamp
    }

    private addLog( log: Log) {
        this.logs.push(log)
        this.logs$ && this.logs$.next(log)
        this.channels$.forEach(
            channel => channel.dispatch(log)
        ) 
    }
}