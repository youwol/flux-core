import * as _ from 'lodash'
import { Observable, ReplaySubject, Subject } from 'rxjs';
import { map } from 'rxjs/operators';
import { getAssetId, getUrlBase } from '@youwol/cdn-client'

import { genericModulePlot, getTransforms } from './drawer-builder';
import { ExpectationStatus, IExpectation } from './contract';
import {Cache} from './cache'
import { Environment, IEnvironment } from '../environment';
import { Context, ErrorLog, Journal, Log, LogChannel } from './context';
import { UnconsistentConfiguration, mergeConfiguration } from './configuration-validation';

export type Pipe<T> = Subject<{ data: T, context?: unknown, configuration?: unknown }>

export function uuidv4() {
    return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function (c) {
        var r = Math.random() * 16 | 0, v = c == 'x' ? r : (r & 0x3 | 0x8);
        return v.toString(16);
    });
}

export class Slot {

    constructor(
        public readonly slotId: string,
        public readonly moduleId: string,
        public readonly metadata: any
    ) { }

}
export class SlotRef {
    constructor(public readonly slotId: string, public readonly moduleId: string) { }
}

export class InputSlot extends Slot {

    public readonly contract:  IExpectation<unknown>
    public readonly description: string

    constructor(slotId: string, moduleId: string, metadata: {description: string, contract: IExpectation<unknown>},
        public readonly subscribeFct) {
        super(slotId, moduleId, metadata)
        
        this.contract = metadata.contract
        this.description = metadata.description
    }
}

export class OutputSlot<T> extends Slot {

    constructor(
        slotId: string, 
        moduleId: string, 
        metadata: any, 
        public readonly observable$: Observable<{data:T, configuration: any, context: any}>
        ) {
        super(slotId, moduleId, metadata)
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

    constructor({ title, description, data }: { title: string, description: string, data: any }) {

        this.title = title
        this.description = description
        this.data = data
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
     *  This attributes stores the module's factory, it is populated when the decorator
     *  '@Flux' is hitted by the compiler
     */
     public readonly modules : {[key:string]: Factory} = {} // Module's factory id => Factory

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

    constructor(
        public readonly mdle: ModuleFlux, 
        ...params) {

        super(...params)
        if(Error.captureStackTrace) {
            Error.captureStackTrace(this, ModuleError);
          }
        this.name = 'ModuleError';
    }
}

export class ConfigurationError extends ModuleError{

    constructor(
        mdle: ModuleFlux, 
        message:string, 
        public readonly status:UnconsistentConfiguration<any>
        ){
        super(mdle, message)
    }
}


export class ContractUnfulfilledError extends ModuleError{

    constructor(
        mdle: ModuleFlux,
        message: string, 
        public readonly status: ExpectationStatus<unknown>
        ){
        super(mdle, message)
    }
}

/**
 * 
 * Base class for modules in Flux
 * 
 * When creating a new module's type, it has to inherit either directly or indirectly from 
 * this class. 
 * 
 * > In the case of a plugin, see the [[PluginFlux | plugin]] class - they basically 
 * add an attribute 'parentModule' upon ModuleFlux, and usually are associated 
 * to a concept of [[SideEffect]] (when plugin is installed/removed).
 * 
 * The main steps of defining a module are described below.
 * 
 * ### Defining inputs
 * 
 * The purpose of an input is to trigger a process when incoming data
 * reach it.
 * A process is basically a function: as in a function, all the arguments should 
 * be provided **at the same time** - meaning incoming data should include all the 
 * 'arguments' at once of the process.
 * 
 * In *Flux*, there is no restriction upon which module's output can be connected
 * to another module's input: the data's type reaching a module are unknwown.
 * To facilitate dealing with *a priori* unknown data, the module can specify [[Contract | contract]] 
 * for each of its input to ensure required conditions are fullfiled before reaching the input's process
 * (it also provide a strongly typed 'get' function).
 * 
 * See [[addInput]].
 * 
 * ### Defining outputs
 * 
 * The purpose of an output is to emit data, as opposed to the input case, the type's 
 * of the data are known and provided to the [[addOutput]] function.
 * 
 * ### Defining the rendering view (optional)
 * 
 * Some modules may be associated to a view allowing the user to interact with the module.
 * See [[ModuleRendererRun]].
 *  
 * ## Examples
 * 
 * Commented code of usual scenarios are provided in the tests folder:
 * -    [example1](https://github.com/youwol/flux-core/blob/main/src/tests/example1.test.ts) 
 * A case of a module that does operations with 2 numbers
 * 
 * ## Deriving a new module's type
 * 
 * This ModuleFlux's constructor is usually called by forwarding the parameters from 
 * the constructor of the derived class: 
 * 
 * ```typescript
 *  export class Module extends ModuleFlux {
 * 
 *       constructor( params ){
 *           super(params) 
 *          //...
 *       }
 *   }
 ```
 *  
 * An exception is when a module is exposing helper functions 
 * (helper functions can be used when writting [[Adaptor | adpators]]):
 *```typescript
 *
 *  function myHelpingFunction(){
 *      //...
 *  }
 *  export class Module extends ModuleFlux {
 * 
 *       constructor( params ){
 *           super( { ...params, ...{ helpers:{'myHelpingFunction': myHelpingFunction}}) 
 *           //...
 *       }
 *   }
 ```
 *  
 * ## Instantiating modules
 * 
 *  The ModuleFluxs' constructors are usually not called directly:
 * -    in *Flux* app they are called internally
 * -    in unit tests (or custom code), modules are usually instantiated using
 * the function [[instantiateModules]] 
 *
 */
export abstract class ModuleFlux {

    public readonly Factory: Factory
    public readonly moduleId: string
    public readonly environment: IEnvironment
    public readonly configuration: ModuleConfiguration
    public readonly helpers: {[key:string]: any}

    public readonly inputSlots = new Array<InputSlot>()
    public readonly outputSlots = new Array<OutputSlot<any>>()

    public readonly logs$ = new ReplaySubject<Log>(1)
    public readonly logChannels : Array<LogChannel>

    public cache: Cache
    public journals: Array<Journal> = []
    
    /**
     * @param moduleId if provided, the module unique id; if not provided a unique id 
     * is auto generated
     * @param Factory more or less the namespace that encapsulate the module
     * @param configuration the configuration with default persistent data
     * @param environment the hosting environment
     * @param helpers a dictionary of related helping functions that can be used
     * when writing an adaptors for the module
     * @param cache usually not provided (a new cache is created); this argument can 
     * provide a handle for case of cache recycling (e.g. from a previous module's instance).
     */
    constructor({ moduleId, configuration, Factory, cache, environment, helpers }:
        {
            moduleId?: string, configuration: ModuleConfiguration, environment: IEnvironment;
            Factory: Factory, cache?: Cache, helpers?: {[key:string]: any}
        }
    ) {
        this.environment = environment
        this.moduleId = moduleId ? moduleId : uuidv4()
        this.configuration = configuration
        this.Factory = Factory
        this.helpers = helpers ? helpers : {}
        this.cache = cache ? cache : new Cache()
        this.logChannels = [ 
            new LogChannel<Log>({
                filter: (log) => log instanceof Log,
                pipes: [this.logs$]
            }),
            new LogChannel<ErrorLog<ModuleError>>({
                filter: (log) => log instanceof ErrorLog,
                pipes: [this.environment.errors$]
            })
        ]
    }

    /**
     * @param slotId the slot id 
     * @returns Matching input or output slot; undefined if not found
     */
    getSlot(slotId: string): Slot | undefined {
        return [...this.inputSlots, ...this.outputSlots].find((slot) => slot.slotId == slotId)
    }

    /**
     * @param slotId the slot id 
     * @returns Matching input slot; undefined if not found
     */
    getInputSlot(slotId: string): InputSlot | undefined {
        return this.inputSlots.find((slot) => slot.slotId == slotId)
    }

    /**
     * @param slotId the slot id 
     * @returns Matching output slot; undefined if not found
     */
    getOutputSlot<T=unknown>(
        slotId: string
        ): OutputSlot<{data:T, configuration:any, context: any}> | undefined {

        return this.outputSlots.find((slot) => slot.slotId == slotId)
    }
    /**
     * Log a message with data in the 'console' ('console' is exposed in the [[IEnvironment | environment]]).
     * 
     * @param message 
     * @param data 
     */
    log(message, data) {
        this.environment.console && this.environment.console.log(this.Factory.id, message, data, this)
    }

    /**
     * This function return the **default** PersistentData of the module.
     * The default data can be updated at run time: the updated version 
     * is then provided to the 'onTriggered' callback defined in [[addInput]]
     * method.
     * 
     * @returns Default persistent data 
     */
    getConfiguration<TPersistentData>() : TPersistentData{
        return this.configuration.data as TPersistentData
    }

    /**
     * From the  [example1](https://github.com/youwol/flux-core/blob/main/src/tests/example1.test.ts),
     * below is an instance of input's declaration, we use it to introduce some important concepts.
     *  
     *```typescript
     *   this.addInput({
     *      id:'input',
     *      description: 'trigger an operation between 2 numbers',
     *      contract: expectCount<number>( {count:2, when:permissiveNumber}),
     *      onTriggered: (
     *          {data, configuration, context}:
     *          {data: [number, number], configuration: PersistentData, context: Context }) => 
     *              this.do(data, configuration, context)
     *   })
     ``` 
     * ### A note about contract
     *
     * There are two benefits of providing one (there exist the [[freeContract]]
     * if you are not interested by the benefits ):
     * -    it ensures that the data that will enter the 'onTriggered' function verifies 
     * a list of preconditions
     * -    it allows to provide strongly typed data to the 'onTriggered' callback (here [number, number]).
     * By using for instance a *freeContract* the type of data is unknown.
     *
     * ### A note about *{data, configuration, context}* parameters
     *
     * As can be seen in the above example, the arguments provide to the *onTriggered* callback are:
     * -    data: this is the data part of the incoming message
     * -    configuration: this is the configuration: a merge between the default one defined
     * by the user and eventually some attributes provided in the 'configuration' part of the incoming 
     * message. Usually, these overidding attributes ared defined using [[Adaptor | adaptors]].
     * -    [[Context | context]]: the context has two objectives: (i) to forward some user defined mapping
     * key->value through the workflow, (ii) to allow the developer to provide (eventually interactives) 
     * insights about module's execution (info, errors, timings, execution stack). 
     * In 'Flux' users can access them through right click on a module, the [[Journal | journals]]. 
     * 
     * 
     * @param id id - usually a meaningfull name that is not shared with other inputs/outputs
     * @param description description of the process triggered by the input when incoming data
     * comes in
     * @param contract [[Contract | contract]] that defines pre-conditions for incoming data to fullfil in order
     * to reach the triggered process
     * @param onTriggered The callback called with incoming data 
     */
    addInput({ id, description, contract, onTriggered }
        :{
            id: string, 
            description:string, 
            contract: IExpectation<unknown>, 
            onTriggered : ({data, configuration, context}, {cache: Cache}) => void
        }
        ){
        let slot = this.newInputSlot({id, description, contract, onTriggered })
        this.inputSlots.push(slot)
    }

    /**
     * The method **addOutput** declares a new output for the module and
     * return a handle ([[Pipe]]) to emit value at any time.
     * 
     * An output is usually used in such way:
     * 
     ```typescript
     * export class Module extends ModuleFlux {
        
     *      result$ : Pipe<number>
     *
     *       constructor( params ){
     *          super(params) 
     *
     *          this.addInput({
     *               id:'input',
     *               description: 'trigger an operation between 2 numbers',
     *               contract: expectCount<number>( {count:2, when:permissiveNumber}),
     *               onTriggered: ({data, configuration, context}) => 
     *                  this.do(data, configuration, context)
     *           })
     *          this.result$ = this.addOutput({id:'result'})
     *      }
     * 
     *      do( data: [number, number], configuration: PersistentData, context: Context ) {
     *
     *          let result = operationsFactory[configuration.operationType](data)
     *          context.info('Computation done', {result})
     *          this.result$.next({data:result,context})
     *       }
     *  }
     * 
     ``` 
     * Couple of comments:
     * -    The [[Pipe]] **result$**  is strongly typed; the trailing '$' character is a convention
     * from RxJS to indicates that the variable is a stream.
     * -    We send some data into the pipe using the **next** method.
     * -    Whenever possible, it is important to forward the input context into the output pipe:
     *  (i) it ensures that user defined context in the workflow app is properly forwarded, and (ii) it
     * allows to provide more information in the journals of execution about output emissions.
     * 
     * @param id  id - usually a meaningfull name that is not share with other inputs/outputs
     * @returns A pipe that allows to emit data
     */
    addOutput<T>({id} : {id: string}): Pipe<T> {

        let obs$ = new ReplaySubject<{ data: T, configuration?:Object, context?: Context }>(1)
        let piped = obs$.pipe(
            map(({ data, context, configuration }:{data: T, context?: Context, configuration?:Object}) => {
                context && context.info('emit output', data)
                this.log("send output", { data, context, this: this })
                return { 
                    data, 
                    configuration: configuration, 
                    context: context ? context.userContext : {}
                }
            })
        )
        this.outputSlots.push(new OutputSlot<{ data: T, context: Context }>(id, this.moduleId, {}, piped as any))
        return obs$ as any;
    }

    /**
     * Add/update a journal record (only one journal for a specific title is stored).
     * 
     * @param title title of the journal
     * @param entryPoint the [[Context | context]] entry point of the journal
     */
    addJournal( { title, entryPoint } : {title: string, entryPoint: Context}) {

        this.journals = this.journals
        .filter( j => j.title != title)
        .concat([new Journal({title, entryPoint})])
    }

    private newInputSlot({id, description, contract, onTriggered }:
        {id: string, description:string, contract: IExpectation<unknown>, onTriggered}
        ){

        return new InputSlot(
            id, 
            this.moduleId, 
            {description, contract},
            ({ connection, data }: { connection: Connection, data: any }) => {
                try{
                    this.processInput(onTriggered, { connection, data, slotId:id }) 
                }
                catch(e){
                    console.error(e)
                }
            }
        )
    }

    private processInput(processDataFct, { connection, data, slotId}: { connection: Connection, data: any, slotId:string }) {

        let inputSlot = this.inputSlots.find( slot => slot.slotId == slotId)
        let f = processDataFct.bind(this)

        let context = new Context( 'input processing',  data.context || {},  this.logChannels ) 
        this.addJournal({
            title: `Execution triggered from input slot "${slotId}"`,
            entryPoint: context
        })
        context.info(
            `start processing function of module ${this.moduleId}`,
            { connection, 'raw input': data, slotId}
        )
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
            conf = context.withChild(
                "merge configuration" ,
                (ctx: Context) => {
                    let status = mergeConfiguration(conf, adaptedInput.configuration)

                    if(status instanceof UnconsistentConfiguration)
                        throw new ConfigurationError(
                            this,
                            "Failed to merge default configuration with dynamic attributes", 
                            status)

                    return status.result
            })
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

        let contract = inputSlot.contract

        let resolution = context.withChild( 
            'resolve contract' , 
            (ctx) => {
                let resolution = contract.resolve(adaptedInput.data)
                if(resolution.succeeded)
                    ctx.info('resolved expectations', resolution)
                if(!resolution.succeeded)
                    throw new ContractUnfulfilledError(
                        this,
                        `The contract of the input "${slotId}" has not been fullfiled.`, resolution
                    )
                return resolution
            }
        )
        let input = { 
            data: resolution.value,
            configuration:conf, 
            context
        }
        context.info('Input provided to the module', {data: input.data, configuration: conf})
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

/**
 * Base class for plugins in *Flux*
 * 
 * When a new plugin's type is created, it has to inherit either directly or indirectly from 
 * this class.
 */
export class PluginFlux<T> extends ModuleFlux {

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
            title, description, data
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
