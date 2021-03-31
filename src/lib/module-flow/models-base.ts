import * as _ from 'lodash'
import { Observable, ReplaySubject, Subject } from 'rxjs';
import { filter, map } from 'rxjs/operators';
import { getAssetId, getUrlBase } from '@youwol/cdn-client'

import { genericModulePlot, getTransforms } from './drawer-builder';
import { Contract, IExpectation } from './contract';
import {Cache} from './cache'
import { Environment, IEnvironment } from '../environment';
import { Context, ErrorLog, Log } from './context';

export type Pipe<T> = Subject<{ data: T, context?: Context }>

export class Slot {

    constructor(
        public readonly slotId: string,
        public readonly moduleId: string,
        public readonly schema: any
    ) { }

}
export class SlotRef {
    constructor(public readonly slotId: string, public readonly moduleId: string) { }
}

export class InputSlot extends Slot {

    constructor(slotId: string, moduleId: string, schema: {description: string, contract: IExpectation<unknown>},
        public readonly subscribeFct) {
        super(slotId, moduleId, schema)
    }
}

export class OutputSlot<T> extends Slot {

    constructor(slotId: string, moduleId: string, schema: any, public readonly observable$: Observable<T>) {
        super(slotId, moduleId, schema)
    }
}

export class Connection {

    readonly connectionId: string
    constructor(
        public readonly start: SlotRef,
        public readonly end: SlotRef,
        public readonly adaptor: Adaptor = undefined) {
        this.connectionId = `${start.slotId}@${start.moduleId}-${end.slotId}@${end.moduleId}`
    }
}

export class ModuleConfiguration {

    public readonly title: string
    public readonly description: string
    public data: any
    public readonly schema: Object

    constructor({ title, description, data, schema }: { title: string, description: string, data: any, schema: any }) {

        this.title = title
        this.description = description
        this.data = data
        this.schema = schema
    }
}

export type Factory = {
    id: string,
    packId: string,
    uid: string,
    displayName: string,
    isPlugIn: boolean,
    schemas: any,
    resources: {[key:string]: string}
    consumersData: {[key:string]: any}
    Module: any,
    BuilderView: any,
    RenderView: any,
    PersistentData: any,
    Configuration: any
}

export class FluxPack{

    public readonly name: string
    public readonly assetId: string
    public readonly version: string
    public readonly description: string
    public readonly urlCDN: string

    /**
     *  This attributes stores the module's factory, it is pospulated when the decorator
     *  '@Flux' is hitted by the compiler
     */
    private modules : {[key:string]: Factory} = {} // Module's factory id => Factory

    constructor(
        {
            name,
            version,
            description
        }: {
            name: string,
            version: string,
            description?: string,
        },
            public readonly install?: (Environment) => Observable<any> | Promise<any> | void
            ){

            this.name = name
            this.version = version
            this.description = description
            this.assetId = getAssetId(name)
            this.urlCDN = getUrlBase(name, version)
        }

    addModule( moduleId: string, factory: Factory){
        this.modules[moduleId] = factory
    }

    getFactory(moduleId: string){
        return this.modules[moduleId]
    }
}


export class ModuleError extends Error {

    constructor(public readonly mdle: ModuleFlow, ...params) {
        super(...params)
        if(Error.captureStackTrace) {
            Error.captureStackTrace(this, ModuleError);
          }
        this.name = 'ModuleError';
    }
}


export abstract class ModuleFlow {

    public readonly Factory: Factory

    public readonly moduleId: string
    public readonly environment: IEnvironment
    public readonly configuration: ModuleConfiguration
    public readonly logger: any
    public readonly helpers: {[key:string]: any}

    public inputSlots = new Array<InputSlot>()
    public outputSlots = new Array<OutputSlot<any>>()

    public cache: Cache

    public readonly logs$ = new ReplaySubject<Log>(1)
    public readonly notifier$ = new ReplaySubject(1)

    constructor({ moduleId, configuration, Factory, cache, logger, environment, helpers }:
        {
            moduleId: string, configuration: ModuleConfiguration, environment: Environment;
            Factory: Factory, cache?: Cache, logger?: any, helpers?: {[key:string]: any}
        }
    ) {
        this.environment = environment
        this.moduleId = moduleId
        this.configuration = configuration
        this.Factory = Factory
        this.helpers = helpers ? helpers : {}
        this.cache = cache ? cache : new Cache()
        this.logger = logger ? logger : { debug: (title, message, object, mdle) => console.log(title, message, object) }
        this.logs$.pipe(
            filter( log => log instanceof ErrorLog )
        ).subscribe( (errorLog: ErrorLog)  => {
            this.notifier$.next( new ModuleError(this, errorLog.text ))
        })
    }

    getSlot(slotId): Slot {
        return [...this.inputSlots, ...this.outputSlots].find((slot) => slot.slotId == slotId)
    }

    log(message, data) {
        this.logger && this.logger.debug(this.Factory.id, message, data, this)
    }

    getConfiguration<T>() {
        return this.configuration.data as T
    }

    addInput({ id, description, contract, onTriggered }
        :{id: string, description:string, contract: IExpectation<unknown>, onTriggered}
        ){
        let slot = this.newInputSlot({id, description, contract, onTriggered })
        this.inputSlots.push(slot)
    }

    addOutput<T>({id} : {id: string}): Pipe<T> {

        let obs$ = new ReplaySubject<{ data: T, context: Context }>(1)
        let piped = obs$.pipe(
            map(({ data, context }) => {
                context && context.output('emit output', data)
                this.log("send output", { data, context, this: this })
                return { data, configuration:{}, context: context ? context.userContext : {}}
            })
        )
        this.outputSlots.push(new OutputSlot<{ data: T, context: Context }>(id, this.moduleId, {}, piped as any))
        return obs$ as any;
    }

    private newInputSlot({id, description, contract, onTriggered }:
        {id: string, description:string, contract: IExpectation<unknown>, onTriggered}
        ){

        return new InputSlot(
            id, 
            this.moduleId, 
            {description, contract},
            ({ connection, data }: { connection: Connection, data: any }) => {
                this.processInput(onTriggered, { connection, data, slotId:id })
            }
        )
    }

    private processInput(processDataFct, { connection, data, slotId}: { connection: Connection, data: any, slotId:string }) {

        let inputSlot = this.inputSlots.find( slot => slot.slotId == slotId)
        let f = processDataFct.bind(this)

        let context = new Context('input processing', data.context || {}, this.logs$)

        let adaptedInput = data

        if( connection && connection.adaptor ){
            adaptedInput = context.withChild(
                "execute adaptor" ,
                (ctx: Context) => {
                    return connection.adaptor.mappingFunction(data, this.helpers)
                })
        }
        
        let conf = this.configuration.data

        if (adaptedInput.configuration) {
            conf = _.cloneDeep(conf)
            _.mergeWith(conf, adaptedInput.configuration)
            context.info("Merged configuration with adaptor configuration's attributes", conf)
        }
        
        this.log("processInput", {
            connection: connection,
            input: {
                data: data.data,
                configuration: data.configuration,
                context: data.context
            },
            adaptedInput: adaptedInput,
            conf: conf,
            this: this
        })

        let contract : Contract = inputSlot.schema.contract

        let resolution = context.withChild( 
            'contract resolution' , 
            (ctx) => {
                let resolution = contract.resolve(adaptedInput.data)
                ctx.expectation('resolved expectations', resolution)
                if(!resolution.succeeded)
                    throw Error(`The input's contract of the input '${slotId}' has not been fullfiled.`)
                return resolution
            }
        )
        let input = { 
            data: resolution.value,
            configuration:conf, 
            context
        }
        context.info('Input data provided to the module', {data: input.data, configuration: conf})
        context.withChild(
            "module's processing",
            (ctx) => {
                return f( input, {cache: this.cache} )
            }
        )
    }
}


export abstract class ModuleRendererBuild {

    Factory: Factory
    static iconsFactory = {}

    static notifier$ = new Subject()

    constructor({ svgIcon, Factory }: { svgIcon: string, Factory: any }) {

        this.Factory = Factory
        if (!ModuleRendererBuild.iconsFactory[Factory.uid])
            ModuleRendererBuild.iconsFactory[Factory.uid] = { icon: svgIcon, iconNormalized: undefined }
    }


    icon() {
        let iconsMdl = ModuleRendererBuild.iconsFactory[this.Factory.uid]
        if (iconsMdl.iconNormalized)
            return iconsMdl.iconNormalized

        let svg = document.createElementNS("http://www.w3.org/2000/svg", "svg");
        svg.setAttribute("width", "100px");
        svg.setAttribute("height", "100px");
        const g = document.createElementNS("http://www.w3.org/2000/svg", "g")
        g.innerHTML = iconsMdl.icon
        svg.appendChild(g)
        document.body.appendChild(svg)
        let transforms = getTransforms(g)
        svg.remove()
        iconsMdl.iconNormalized = { content: `<g style='transform:${transforms}'> ${iconsMdl.icon} </g>`, transforms: transforms }

        return iconsMdl.iconNormalized
    }

    render(mdle: any) {
        return genericModulePlot({
            module: mdle,
            icon: this.icon(),
            width: 150,
            vMargin: 50,
            vStep: 25
        })
    }
}

export abstract class ModuleRendererRun {


    constructor() { }

    abstract render()
}

export class PluginFlow<T> extends ModuleFlow {

    readonly parentModule : T = undefined

    constructor(paramsDict: any) {
        super(paramsDict)
        this.parentModule = paramsDict.parentModule
    }
}


export interface SideEffects {

    apply()
    dispose()
}

export function instanceOfSideEffects(object: any): object is SideEffects {

    let obj = object as SideEffects
    return obj.apply !== undefined && obj.dispose !== undefined
}

export class AdaptorConfiguration extends ModuleConfiguration {

    constructor(
        public readonly title = "RemotePressure",
        public readonly description = "",
        public readonly data = {
            code: `/*
the following function should return the transformed data, and eventually overiding configuration 
parameters.  
*/
return ({data,configuration,context}) => ({
    data: data,
    context:context,
    configuration: configuration
})`
        }) {
        super({
            title, description, data,
            schema: {
                "type": "object",
                "properties": {
                    "code": { "type": "string" }
                }
            }
        })
    }
}

export class Adaptor {

    mappingFunction = undefined
    constructor(
        public readonly adaptorId: string,
        public readonly configuration: AdaptorConfiguration) {

        this.mappingFunction = new Function(configuration.data.code)()
    }
}
