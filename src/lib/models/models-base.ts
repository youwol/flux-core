
/**
 * # Introduction 👋
 * 
 * Flux is a low code solution to create interactive applications from the 
 * description of data-flows and views. 
 * This library is the foundation of this low code solution.
 * The [flux-builder](https://github.com/youwol/flux-builder) web-application 
 * enables building the applications using a user friendly interface,
 * while [flux-runner](https://github.com/youwol/flux-runner) is available to run them.
 * 
 * <figure class="image" style="text-align: center; font-style: italic;">
 *     <img src="https://raw.githubusercontent.com/youwol/flux-builder/master/images/screenshots/overall-view.png" alt="">
 *     <figcaption>Illustration of the flux-builder web application. The top panel is referenced as 'builder-panel'
 * and the bottom panel as 'rendering-panel'</figcaption>
 * </figure>
 *
 * Contrasting with other low-code solutions, Flux ecosystem not only allows to 
 * define attractive UIs but also enables the description of complex data flows between
 * processing units (called modules). These processing units can be running either on your computer
 * or on remote severs - the latter being especially relevant for long-running computations.  
 * 
 * 
 * A workflow is organized around modules and connections,
 * an hypothetical workflow can be represented like this:
 * ```
 *             physicalMdle 
 *                          \
 *                           combineMdle-->simulatorMdle-->viewerMdle
 *                          /
 *  sliderMdle-->solverMdle
 * ```
 * This describes the data flow of the application. Modules features one or multiple
 * inputs and/or outputs. They can react on incoming messages and emit output messages. 
 * Connections support the transmission of messages, always from upstream modules to downstream modules.
 * Any messages emitted by a module can not be altered afterward whatsoever. 
 * 
 * In the above workflow, two modules - **sliderMdle** 
 * and **viewerMdle** - are associated to a view, they can be arranged and styled in a layout 
 * editor in a so called *rendering-panel*, e.g.:
 * ```
 *  ___________________________________
 * |   slider        ___viewer_____   |
 * |  ----|----     |              |  |
 * |                | ( ͡• ͜ʖ ͡•)👌  |  |
 * |                |              |  |        
 * |                |______________|  |
 * |__________________________________|
 * ```
 * 
 * In the above 'application' the data-flow is:
 * -    user move the slider, the **sliderMdle** emits a message containing the current value
 * -    the **solverMdle** intercept it and emit a *solverModel* accordingly
 * -    the **combineMdle** join and emit the created *solverModel* with some *physicalModel*
 * produced by the **physicalMdle**
 * -    the **simulatorMdle** does a simulation and emit the results
 * -    the results are then rendered by the **viewerMdle**
 * 
 * The elementary building blocks of Flux applications are modules, they are exposed 
 * by javascript (npm) packages. 
 * In practice, one package usually gathers multiple modules related to the same domain - it is called a *flux-pack*. 
 * 
 * We start in the next section the description of *Flux-pack* creation, and start 
 * to correlate the concepts described above with associated classes/functions. 
 * The example above is used as guideline through the discussions and examples. 
 * 
 * > What follows reference the YouWol's local environment published [here](https://pypi.org/project/youwol/).
 * > If you want to exercises in practice what is discussed you should install it.
 * > It provides a layer above your favorite stack to easily create/update/publish
 * > *flux-packs* and exercise them within the [flux-builder](https://github.com/youwol/flux-builder) 
 * > web application (running locally 🤯). 
 * 
 * 
 * # Creation of a flux-pack 📦
 * 
 * > From YouWol's dashboard click on packages -> new package, provide a name to your package & install: 
 * > that will create a skeleton project you can complete through the course of the discussions. 
 * 
 * Let's start by implementing a [[ FluxPack | flux-pack]] containing a (rather empty) [[ModuleFlux | module]].
 * Here is the declaration of the [[ FluxPack | flux-pack]]:
 *```typescript
 * //file main.ts
 * import { FluxPack } from '@youwol/flux-core'
 * // auto generated from 'package.json' - we'll go back to this latter
 * import { AUTO_GENERATED } from '../auto_generated'
 * 
 * export let pack = new FluxPack(AUTO_GENERATED}
 * ```
 * > ❕ the variable name 'pack' matters: it is the normalized entry point of every *flux-pack*. 
 *  
 * Below is the implementation of the [[ModuleFlux | module]]:
 *```typescript
 *  // file hello-world.module.ts
 *  import {pack} from './main.ts'
 *  import {Flux, BuilderView, ModuleFlux} from '@youwol/flux-core'
 * 
 *  export namespace SimulatorModule{
 * 
 *      @Flux({
 *          id: 'simulator',
 *          pack,
 *          namespace: SimulatorModule
 *      })
 *      @BuilderView({
 *          icon: '<text> Simulator </text>',
 *          namespace: SimulatorModule
 *      })
 *      export class Module extends ModuleFlux {
 * 
 *          constructor( params ){
 *              super(params) 
 *          }
 *      }
 *  }
 * ```
 * 
 * Those two files define a valid *flux-pack*, you can build & publish (in the CDN) the package 
 * and start using it in a Flux application.
 * 
 *  ## Module's namespace  🏭
 * 
 * All the data related to one module are encapsulated in a namespace, it includes the definition of:
 * -    the [[ModuleFlux | module]] itself: this is where most of the logic will go
 * -    the persistent data (optional - not presented yet): data of the module the user will be able to save with their applications
 * -    the builder view: how the user will see and interact with your module in the *builder-panel* of the application.
 * This is the purpose of the [[BuilderView]] decorator.
 * -    the rendering view (optional - not presented yet): how the user will see and interact with your module 
 * in the *rendering-panel* of their applications. 
 * Not all modules have rendering view associated (e.g. a pure computational module probably won't).
 *
 * > 🧐 On top of the classes/structures explicitly written in it, decorators are generating other
 * > required data in the namespace. 
 * 
 * The namespace acts as the [[Factory]] of the module: having it includes everything needed to create instances
 * of the various objects related to the module (e.g. configuration, builder view, render view, etc).
 * You can have a look to the unit tests if you are interested about coding flux applications (see also [[instantiateModules]]). 
 * 
 * Let's move forward and include some logic in the module
 * 
 * ## Defining inputs & outputs ⇌
 * 
 * Let's move on the simulator module and add a fake simulation triggered 
 * when a [[Message | message]] comes in:
 * 
 * ``` typescript
 * export class Module extends ModuleFlux {
 *    
 *    output$ : Pipe<number> 
 * 
 *    constructor( params ){
 *        super(params) 
 * 
 *        this.addInput({
 *            onTriggered: ({data} : {data:unknown}) => this.simulate( data )
 *        })
 *        this.output$ = this.addOutput()
 *    }
 * 
 *    simulate( data: unknown ){
 *          
 *        this.output$.next({data:42})
 *    }
 * }
 * ```
 *  > What!? **unknowns** 😩
 * 
 * The method [[ModuleFlux.addInput]] is used to add an input to the module. 
 * The key point is to provide a callback to be triggered at message reception.
 * 
 * The method [[ModuleFlux.addOutput]] is used to add an output to the module.
 * It returns a [[Pipe]]: it is an handle to emit messages. 
 * 
 * > There is a lot of **$** suffix in the library 🤨. It has been popularized by 
 * > [Cycle.js](https://cycle.js.org/): 
 * > *'The dollar sign $ suffixed to a name is a soft convention to indicate that the variable is a stream.'*
 * > In *flux-core* the streams are backed by [RxJs Observable](https://rxjs-dev.firebaseapp.com/guide/observable)
 * > (as readonly source of data)
 * > as well as [Subjects](https://rxjs-dev.firebaseapp.com/guide/subject) (for read & write).
 * 
 * 
 * ### A word about contract
 * 
 * In the above snippet the type of the *data* is **unknown**. 
 * It can't be otherwise with no additional information as any modules can have been used 
 * to provide the incoming message. That being said, modules are not supposed to work 
 * with any kind of incoming data. 
 * 
 * The developer can provide expectations in terms of 
 * accepted data-structures using the concept of [[contract | contract]]:
 * 
 * ``` typescript
 * // additional imports
 * import {compute, PhysicalModel, SolverModel } from 'somewhere'
 * import {contract, expectInstanceOf } from '@youwol/flux-core'
 * 
 * let contract = contract({
 *       requireds: {   
 *           physModel:expectSingle<PhysicalModel>({
 *              when: expectInstanceOf(PhysicalModel) 
 *           }), 
 *           solverModel:expectSingle<SolverModel>({
 *              when:  expectInstanceOf(SolverModel)
 *           }), 
 *       }
 *   })
 * 
 * type NormalizedData = {
 *      physModel: PhysicalModel,
 *      solverModel: SolverModel
 * }
 * // Decorators @Flux, @BuilderView skipped
 * export class Module extends ModuleFlux {
 *    
 *    output$ : Pipe<number> 
 * 
 *    constructor( params ){
 *        super(params) 
 * 
 *        this.addInput({
 *            contract,
 *            onTriggered: ({data} : {data:NormalizedData} ) => 
 *                          this.simulate( data.physModel, data.solverModel )
 *        })
 *        this.output$ = this.addOutput()
 *    }
 * 
 *    simulate( physModel: PhysicalModel, solverModel: SolverModel ){
 *          
 *        compute().then( (result) => this.output$.next({data: result}) )
 *    }
 * }
 * ```
 * > No more **unknown** 😇 
 * 
 * In this case, the contract defines two expectations on the incoming messages:
 * -    to retrieve exactly one variable of type *PhysicalModel*
 * -    to retrieve exactly one variable of type *SolverModel*
 * 
 * Providing a contract to an input helps in terms of pre-conditions checks, data normalization and
 * errors-reporting. You can find out more on contract in this [[contract | section]]
 * 
 * 
 * ## What's next ? 🧐
 * 
 * ### Adding a configuration 🎛
 * 
 * In most of the case, a module relies on some parameters with default values 
 * (e.g. a *threshold* property for the **simulatorMdle**), which should be editable
 * by the builder of a flux application and persisted with it.
 * This is the purpose of a module's configuration.
 *  
 * >
 * >  <figure class="image" style="text-align: center; font-style: italic">
 * >    <img src="https://raw.githubusercontent.com/youwol/flux-builder/master/images/screenshots/settings-editor.png" alt=""
 * >    height="300px"">
 * >    <figcaption> flux-builder auto-generates settings panel from configurations</figcaption>
 * > </figure>
 *
 * 
 * The library provides a simple way to define configuration.
 * The developer needs to include a class called **PersistentData** into the module's namespace
 * and decorate the properties to expose, e.g.:
 * 
 * ``` typescript
 * // additional imports
 * import {Schema, Property } from '@youwol/flux-core'
 * 
 * namespace SimulatorModule{
 *    
 *     @Schema()
 *     class PersistentData{
 * 
 *          @property({
 *              description: 'control the threshold of the simulation'
 *          })
 *          threshold: number
 * 
 *          constructor({threshold} : {threshold?: number} = {}){        
 *              this.threshold = threshold != undefined ? threshold : 1e-6
 *          }
 *     }
 * }
 * ```
 * This is a minimalist example, an advanced use case is presented [[Schema  | here]].
 * 
 * The above data-structure is automatically injected in the triggered function as a 
 * named property *configuration*:
 * ``` typescript
 * export class Module extends ModuleFlux {
 *    
 *    output$ : Pipe<number> 
 * 
 *    constructor( params ){
 *        super(params) 
 * 
 *        this.addInput({
 *            contract,
 *            onTriggered: ({ data, configuration}) => 
 *                this.simulate( data.physModel, data.solverModel, configuration )
 *        })
 *        this.output$ = this.addOutput()
 *    }
 * 
 *    simulate( 
 *        physModel: PhysicalModel, 
 *        solverModel: SolverModel, 
 *        conf: PersistentData 
 *        ){
 *          
 *        compute(conf.threshold).then( (result) => this.output$.next({data: result}) )
 *    }
 * ```
 * This configuration argument is called the **dynamic configuration** as it may have been
 * updated at **run time** from values included in a message; 
 * read more about configuration [[ModuleConfiguration | here]].
 *  
 * ### Defining a rendering view 👁
 * 
 * As presented in the introduction, some modules have interactive views displayed
 * in the *rendering-panel*.  
 * The simplest approach to define such views is to add a new decorator [[RenderView]] to the 
 * *Module* class definition.
 *  
 * ### Providing execution feedbacks 📰
 * 
 * Module's execution can (and often should) provides feedbacks about their processes,
 * it helps understanding errors, performance bottlenecks, spurious results, *etc*.
 * 
 * The library introduces the concept of journal for this purpose, they:
 * -    provides synthetic tree representation about the chain of functions 
 * call during the module's execution.
 * -    includes builtin performance metrics  
 * -    can features registered custom views to make complex data-structure easier
 *  to apprehend (e.g. 3D views, dynamic 2D plots, *etc*)
 * 
 * Find out more about journal and its underlying companion context [here](./context.html). 
 * 
 * 
 * ### Creating plugins 🔌
 * 
 * Plugins are like modules, except they can mess up with a companion 😉.
 * It is a feature used quite often in various use case, e.g.:
 * -    for 3d viewer, plugins are used to add various features: object picker, controls in the viewer,
 * compass 
 * -    they can serve to register multiple modules to an orchestrator
 * -    they can intercept input messages and decorate them
 * -    *etc* 
 * 
 * Some documentation about plugins can be found [[ PluginFlux | here]]
 * 
 * ### Optimizing performances 🚄
 * 
 * The functional nature of Flux (close to nothing is allowed to mutate) allows 
 * to provide a simple, yet powerful, caching mechanism that enabled important optimization in 
 * common scenarios in scientific computing. Find out more [[cache | here]].
 * 
 * ### Going beyond simple builder view
 * 
 * It is possible to go beyond a simple representation of the modules in the builder
 * panel. It is possible for instance:
 * -    use any kind of representation as long as it can be expressed in a
 * SVG element
 * -    enable communication between module processes and the view, e.g. 
 * to provide visual hints about module execution
 * 
 * The [[ModuleRendererBuild]] documentation is a good place to start if you are interested.
 *  
 * @module core-concepts
 */
import * as _ from 'lodash'
import { Observable, ReplaySubject, Subject } from 'rxjs';
import { map } from 'rxjs/operators';
import { getAssetId, getUrlBase } from '@youwol/cdn-client'

import { genericModulePlot, getTransforms } from './drawer-builder';
import { ExpectationStatus, IExpectation } from './contract';
import {Cache} from './cache'
import { Environment, IEnvironment } from '../environment';
import { Context, ErrorLog, Journal, Log, LogChannel } from './context';
import { InconsistentConfiguration, mergeConfiguration } from './configuration-validation';
import { Workflow } from '../flux-project/core-models';


export function uuidv4() {
    return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function (c) {
        var r = Math.random() * 16 | 0, v = c == 'x' ? r : (r & 0x3 | 0x8);
        return v.toString(16);
    });
}


/**
 * ## UserContext
 * 
 * See [[Message]]
 */
export type UserContext = {[key:string]: any}


type AnyJson =  boolean | number | string | null | JsonArray | JsonMap;
interface JsonMap {  [key: string]: AnyJson; }
interface JsonArray extends Array<AnyJson> {}

/**
 * ## ConfigurationAttributes
 * 
 * See [[Message]]
 */
 export type ConfigurationAttributes = {[key:string]: AnyJson }


/**
 * ## Message
 * 
 * A message is what is transmitted from modules to modules through a [[Connection | connection]].
 * 
 * Messages have three components: data, configuration and context.
 * 
 * ### data
 * 
 * The data part of the message vehicles the core of the information. 
 * This is what is emitted by the modules in their [[OutputSlot | output slots]].
 * 
 * ### configuration
 * 
 * The configuration part of the message includes some properties meant to override 
 * the default [[Configuration | configuration]] of the destination module.
 *  
 * Setting the configuration component of the message is most of the time achieved using an [[Adaptor | adaptor]]. 
 * 
 * ### context 
 * 
 * The context part of the message is a mapping {[key:string]: any} that the builder of 
 * a Flux application provide (here again, usually using an [[Adaptor | adaptor]]).
 * 
 * It is an append only data-structure transferred through the execution paths of flux applications 
 * that gets completed along the flow. 
 * 
 * It serves at transmitting information from a starting point to a destination point away from multiple connections.
 * The modules are not supposed to use it, they are just in charge to forward it in the most meaningful way
 * (most of the times it is transparent for the modules' developers).
 * 
 * 
 * @template T type of the data part in the message
 */
export type Message<T = unknown> = { data: T, context?: UserContext, configuration?: ConfigurationAttributes }


/**
 * # Pipe
 * 
 * A pipe is the data-structure used by the [[ModuleFlux | modules]] to emit data:
 * -    in their constructor, the modules declare one or multiple pipes using [[ModuleFlux.addOutput]] 
 * and store the reference.
 * -    the reference is used anywhere in the module to emit a [[Message | message]] in the output 
 * connection.
 * 
 * A typical usage:
 * 
 * ```typescript
 *  export class Module extends ModuleFlux {
 * 
 *      output$ : Pipe<number>
 *      
 *      constructor( params ){
 *          super(params) 
 *          this.output$ = this.addOutput({id:'output'})
 *          //...
 *      }
 *      
 *      someFunction(value: number, context: Context){
 *          this.output$.next({data:5, context})    
 *      }
 *   }
 * ```
 * 
 * >! 🤓 a Pipe is actually a [RxJs Subject](https://rxjs-dev.firebaseapp.com/guide/subject) templated 
 * > by the [[Message]] type
 */
export type Pipe<T> = Subject<Message<T>>

/**
 * ## Slot, base class for [[InputSlot]] & [[OutputSlot]].
 * 
 * A slot is the start or the end of a connection that belongs to a module.
 */
export class Slot {

    /**
     * 
     * @param slotId id of the slot in the module
     * @param moduleId id of the module 
     * @param metadata metadata for the slot (different for [[InputSlot]] & [[OutputSlot]] )
     */
    constructor(
        public readonly slotId: string,
        public readonly moduleId: string,
        public readonly metadata: any
    ) { }

}

/** 
 * ## SlotRef
 * 
 * A SlotRef is a unique id of a slot, combining module id and slot id.
 * 
 * > ❕ Because SlotRef is common for input and output slot, the slot ids within 
 * > a module need to be unique for the union (inputSlots, outputSlots).
 * 
 * @hidden
 */
export class SlotRef {
    constructor(public readonly slotId: string, public readonly moduleId: string) { }
}


/**
 * ## InputSlot 
 * 
 * An input slot is [[Slot]] with a callback function that gets 
 * called when a new message arrive through the associated connection.
 * 
 * It also features a description of the triggered process and a [[Contract | contract]] for message validation.
 */
export class InputSlot extends Slot {

    /**
     * [[Contract]] of the input slot regarding incoming data
     */
    public readonly contract:  IExpectation<unknown>

    /**
     * Description of the purpose of the callback function 
     */
    public readonly description: string

    /**
     * 
     * @param slotId slot id within the module
     * @param moduleId module id
     * @param description Description of the purpose of the callback function 
     * @param contract [[Contract]] of the input slot regarding incoming data 
     * @param subscribeFct callback function, connection is the associated connection,
     * data is the incoming message
     */
    constructor(
        slotId: string, 
        moduleId: string, 
        metadata: {
            description: string, 
            contract: IExpectation<unknown>
        },
        public readonly subscribeFct: ({connection, message}) => void ) {

        super(slotId, moduleId, metadata)
        
        this.contract = metadata.contract
        this.description = metadata.description
    }
}

/**
 * ## OutputSlot 
 * 
 * An output slot is [[Slot]] attached to a RxJs observable:
 * when a module emit a value through one of its output slot's [[Pipe]], 
 * this observable
 * 
 * 
 * 
 * It also features a [[Contract | contract]] for input data validation  
 * and a description.
 */
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

/**
 * ## Connection
 * 
 * A connection is a pipe connecting the [[Slot | slot]] of  two modules that transmit [[Message | message]].
 * They may be associated at their end to an adaptor that transform (usually slightly)
 * the message before reaching the destination module.
 * 
 * > 🤓 The adaptor is stored within the connection but the transformation implementation is 
 * > actually belonging to [[ModuleFlux]].
 */
export class Connection {

    /**
     * the connection unique id, composing source [module id, slot id] and
     * destination [module id, slot id].
     */
    readonly connectionId: string

    /**
     * 
     * @param start reference to the message source slot 
     * @param end reference to the message destination slot 
     * @param adaptor an eventual [[Adaptor | adaptor]]
     */
    constructor(
        public readonly start: SlotRef,
        public readonly end: SlotRef,
        public readonly adaptor: Adaptor = undefined) {
        this.connectionId = `${start.slotId}@${start.moduleId}-${end.slotId}@${end.moduleId}`
    }
}


/**
 * ## Configuration
 * 
 * The module configuration is a thin wrapper around the *PersistentData* 
 * provided by the developer into the module's namespace.
 * It is automatically generated when using the [[Flux]] decorator.
 * Once instantiated, the [[ModuleConfiguration.data]] becomes an instance 
 * of *PersistentData*. *PersistentData* and *ModuleConfiguration* are often
 * referenced both as *Configuration*.
 * 
 * The key features of a configuration objects are:
 * -    they can be serialized and de-serialized from JSON data
 * -    they contains enough information to automatically generate 
 * a UI panel to control it (as in [flux-builder](https://github.com/youwol/flux-builder) apps)  
 * -    they can be adjusted at execution time using [[Adaptor]] 
 * 
 * Behind what is called "module's configuration" there can be 3 different states depending on the context:
 * -    **default configuration**: the one constructed from empty data (default hard coded values are used, see this [[Schema | example]])
 * -    **static configuration**: the one provided at the module's construction
 * -    **dynamic configuration**: the one provided to the *onTrigger* callback of
 * a module's input
 * 
 * To better understand the difference between them and see how it relates to adaptors,
 * let's examine a practical example. 
 * 
 * ### Case study
 * 
 * The case study is to control the threshold parameter of the configuration of a 
 * **simulatorMdle** using a **sliderMdle** (it is somehow in line with the example presented in [[core-concepts]]).
 * 
 * The 'application' is constructed using the utility functions 
 * ([[instantiateModules]], [[parseGraph]], [[Runner]] & [[renderTemplate]]) provided in the library 
 * for unit testing:
 * 
 * ```typescript
 * import {SliderModule, SimulatorModule, PhysicalModel, SolverModel} from '...'
 * 
 * let branch = ['|~sliderMdle~|-----=A|~simulatorMdle~|']
 * 
 * let modules = instantiateModules({
 *     sliderMdle:    SliderModule,
 *     simulatorMdle: [SimulatorModule, {threshold: 1e-8}]
 * }) 
 * 
 * // we use hard coded PhysicalModel & SolverModel (focus on configuration here)
 * let adaptors    = {
 *     A : ({data,context}) => ({
 *             data: [new PhysicalModel(), new SolverModel()],
 *             context,
 *             configuration:{threshold: data}
 *         })
 * }
 * 
 * let graph = parseGraph( { branch, modules, adaptors } )
 * new Runner( graph )  
 * 
 * let div = document.createElement("div")
 * div.innerHTML = "`<div id='sliderMdle'> <div>`"  
 * renderTemplate(div,graph.workflow.modules)
 * let sliderDiv = div.querySelector("#sliderMdle") as HTMLDivElement
 * // Unit test tip: we can then simulate event with sliderDiv.dispatchEvent(...)
 * // and make sure the simulatorMdle is reacting appropriately
 * ```
 * 
 * 
 * In the above example we can distinguish the terms **default configuration**
 *  and **static configuration** looking at the call to *instantiateModules*:
 * -    there is no information about configuration for the **sliderMdle**,
 * the configuration will get instantiated from an empty JSON: this is 
 * the **default configuration** of the module
 * -    regarding the **simulatorMdle**, a threshold parameters is provided to
 * initialize the configuration, the resulting instance is referenced
 *  as **static configuration** (it is ≠ from **default configuration**)
 * 
 * To explain what is referenced by **dynamic configuration** let's look at the data flow (the *branch* variable):
 * -    **sliderMlde** event send a number in its output
 * -    it is intercepted by the [[Adaptor | adaptor]] **A** that forward the 
 * message's data (i.e. the slider value) to the property *threshold* of the adapted configuration
 * (that is to say: the *configuration* property of the adaptor's returned value).
 * -    the **simulatorMdle** *onTriggered* callback gets feeded by the **static configuration**
 * merged with the adapted configuration: the *threshold* property is not anymore *1e-8*
 * but whatever the slider emitted. Merging the **static configuration** with the adapted
 * configuration is what is called **dynamic configuration**
 * 
 * > 🤓 It follows: the only place where the dynamic configuration is defined
 * > is inside the triggered functions of a module (provided at [[ModuleFlux.addInput]])
 * 
 */
export class ModuleConfiguration {

    public readonly title: string
    public readonly description: string
    public readonly data: any

    constructor({ title, description, data }: { title: string, description: string, data: any }) {

        this.title = title
        this.description = description
        this.data = data
    }
}

/**
 * ## Factory
 * 
 * A module's Factory is actually the namespace englobing it, the properties are initialized when using the decorators
 * [[Flux]], [[BuilderView]], [[RenderView]].
 * 
 * The factory can hold any other data as it actually is the namespace of the module and 
 * any variables can be defined in it. For instance it can be useful to define some static variables 
 * of your module you need in some places where the Factory is provided.
 * 
 * For consuming applications, data can be stored/retrieved using the [[consumersData]] attribute.
 * 
 * > 🤓 In regular scenarios, most of the properties belonging to Factory 
 * > are generated using the decorators mentioned above.
 * > You can still turn a namespace into module's factory by providing
 * > all of them explicitly, without using decorators.
 */
export type Factory = {
    /**
     * id of the module's factory.
     * 
     * Issued from decorator [[Flux]]
     */
    id: string,

    /**
     * A unique id that references your package.
     * 
     * Issued from decorator [[Flux]].
     */
    packId: string,

    /**
     * combination of [[id]] & [[packId]]: uniquely identifies your module in 
     * the ecosystem Flux.
     */
    uid: string,

    /**
     * display name.
     * 
     * Issued from the decorator [[Flux]]
     */
    displayName: string,

    /**
     * Whether or not the factory generate a module of type [[PluginFlux]].
     * 
     * Issued from the decorator [[@Flux]]
     */
    isPlugIn: boolean,

    /**
     * deprecated: using instanceof is better
     * 
     * Issued from the decorator [[Flux]]
     */
   // schemas: any,

    /**
     * mapping <name, url> of resources
     * 
     * Issued from the decorators [[Flux]]
     */
    resources: {[key:string]: string}

    /**
     * Dynamic data the consumer (host application) may want to associate 
     * to the factory.
     */
    consumersData: {[key:string]: any}


    /**
     * Module constructor, inheriting [[ModuleFlux]], explicitly written.
     * 
     * > 💩 Should not be declared as 'any'
     */
    Module: any,

    /**
     * Builder view constructor, inheriting [[ModuleRendererBuild]]
     * 
     * Issued from the decorator [[BuilderView]]
     * 
     * > 💩 Should not be declared as 'any'
     */
    BuilderView: any,

    /**
     * Render view constructor, inheriting [[ModuleRendererRun]]
     * 
     * Issued from the decorators [[RenderView]]
     * 
     * > 💩 Should not be declared as 'any'
     */
    RenderView: any,

    /**
     * Persistent data constructor, explicitly written.
     * 
     * To get automatic schema generation in Flux, this class should be decorated with [[Schema]].
     * 
     * > 💩 Should not be declared as 'any'
     */
    PersistentData: any,

    /**
     * Configuration ([[ModuleConfiguration]])
     * 
     * Issued from the decorator [[Flux]]
     */
    Configuration: any

    /**
     * @Hidden
     */
    [key:string]: any
}

/**
 * ## FluxPack
 * 
 * A FluxPack gather the description of the package to be properly consumed by Flux applications.
 * It gather some basic information as well as the registered [[ModuleFlux | modules]] and 
 * [[PluginFlux | plugins]].
 * 
 * Modules/plugins registration is done automatically when using the decorator [[Flux]] 
 * (through the [[Flux.pack]] attribute).
 * 
 * > ❕ A package meant to be consumed by Flux needs to instantiate and export a FluxPack variable with the 
 * > name 'pack' (no variation). Usually it is declared in the file 'main.ts' at the higher level of your package's
 * > source
 *  
 * The common scenario of FluxPack initialization is to use the AUTO_GENERATED data that is generated using the 'package.json' file 
 * at the first step of the build process (when using the pipeline flux-pack of the YouWol local environment).
 * 
 * It follows that most of the times FluxPack initialization is only about eventually providing an install function
 * (e.g. when fetching additional resources is needed - see [[Environment]] in such cases) .
 * 
 * This is a typical FluxPack initialization when no install steps are needed:
 * 
 * ```typescript
 * import { FluxPack } from '@youwol/flux-core'
 * import { AUTO_GENERATED } from '../auto_generated'
 * export let pack = new FluxPack(AUTO_GENERATED}
 * ```
 * 
 * This is a typical FluxPack initialization when some install steps are needed:
 * 
 * ```typescript
 * import { FluxPack, IEnvironment } from '@youwol/flux-core'
 * import { AUTO_GENERATED } from '../auto_generated'

 * export function install(environment: IEnvironment){
 *    return environment.fetchStyleSheets(`some/url/for/css`)
 * }
 *
 * export let pack = new FluxPack({
 *    ...AUTO_GENERATED, ...{ install }
 * })
 * ```
 */
export class FluxPack{

    /**
     * name of the fluxPack, the package.json name if AUTO_GENERATED fields are used
     */
    public readonly name: string

    /**
     * asset id in the YouWol's assets store
     */
    public readonly assetId: string

    /**
     * version of the FluxPack, the package.json version if AUTO_GENERATED fields are used
     */
    public readonly version: string

     /**
     * description of the FluxPack, the package.json description if AUTO_GENERATED fields are used
     */
    public readonly description: string

    /**
     * the YouWol's CDN url targeting the root folder of your package.
     * It facilitates getting resources (javascript add-ons, bundles, stylesheets, etc) 
     * using the [[Environment | environment]] object.
     * 
     * e.g. to load a stylesheet included in 'dist/assets/style.css' :
     * ```typescript
     * import pack from 'main'
     * 
     * function fetch(env: Environment){
     *  return environment.fetchStyleSheets( `${pack.urlCDN}/dist/assets/style.css` )
     * }
     * 
     * ```
     */
    public readonly urlCDN: string

    /**
     *  This attributes stores the module's factory, it is populated when the decorator
     *  '@Flux' is run by the compiler
     */
     public readonly modules : {[key:string]: Factory} = {} // Module's factory id => Factory

     /**
      * 
      * @param name see [[name]]
      * @param version see [[version]]
      * @param description see [[version]]      *  
      * @param install a function that is called when the bundle of your package has been fetched by the browser.
      * It allows to proceed to additional installation/initialization steps before the modules get instantiated.
      */
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
    /**
     * Register a module in the fluxPack.
     * 
     * Usually only internally used by [[Flux]] decorator.
     * 
     * @param moduleId module's id
     * @param factory module's [[Factory | factory]]
     */
    addModule( moduleId: string, factory: Factory){
        this.modules[moduleId] = factory
    }

    /**
     * 
     * @param moduleId module's id
     * @returns [[Factory | factory]] of the module
     */
    getFactory(moduleId: string){
        return this.modules[moduleId]
    }
}

export abstract class ModuleFlux {

    /**
     * The factory of the module, i.e. its including namespace
     */
    public readonly Factory: Factory

    /**
     * module id, if not provided explicitly at construction it is a [[uuidv4]]
     */
    public readonly moduleId: string

    /**
     * module uuid
     */
    public readonly uuid: string = uuidv4()

    /**
     * Environment, used to:
     * -    fetch resources
     * -    send messages
     * -    send command to the host application
     */
    public readonly environment: IEnvironment

    /**
     * The module's static configuration.
     * 
     * See [[ModuleConfiguration]] for a discussion about static vs dynamic configuration.
     * 
     */
    public readonly configuration: ModuleConfiguration


    /**
     *  A dictionary of helping objects (often functions) that can be used when writing an [[Adaptor | adaptor]] for the module.
     */
    public readonly helpers: {[key:string]: any}

    /**
     * the list of inputSlots, those have to be registered at module's construction.
     * 
     * > 🤓 The number of inputs, and what they do, can depend on the module's configuration
     */
    public readonly inputSlots = new Array<InputSlot>()

    /**
     * the list of inputSlots, those have to be registered at module's construction.
     * 
     * > 🤓 The number of outputs, and what they do, can depend on the module's configuration
     */
    public readonly outputSlots = new Array<OutputSlot<any>>()

    /**
     * Observable that emits the [[Log | logs]] of the module.
     */
    public readonly logs$ = new ReplaySubject<Log>(1)

    /**
     * The channels of logs broadcasting, by default:
     * -    all logs are broadcasted to [[logs]]
     * -    error logs are broadcasted to [[Environment.errors$]]
     */
    public readonly logChannels : Array<LogChannel>

    /**
     * Module's [[Cache | cache]], usually initialized at module construction (except if one is provided at construction).
     * 
     */
    public cache: Cache

    /**
     * The list of available [[Journal | journals]].
     * 
     * This includes:
     * -    the journal generated while processing incoming [[Message | messages]]
     * -    some custom journals the developer of the module decided to expose
     * 
     * > ❕ Only the latest Journal for a particular [[Journal.title]] attribute is kept in memory.
     */
    public journals: Array<Journal> = []
    
    /*
    An object that can be used to store custom data about the module.  
    */
    public userData: {[key:string]: unknown} = {}

    /**
     * @param moduleId see [[moduleId]]
     * @param Factory see [[Factory]]
     * @param configuration see [[Configuration]]
     * @param environment see [[environment]]
     * @param helpers  see [[helpers]]
     * @param cache usually not provided (a new cache is created). In case it is needed to reuse a 
     * cache (e.g. of a previous instance of the module) this argument can be provided.
     */
    constructor({ moduleId, configuration, Factory, cache, environment, helpers, userData }:
        {
            moduleId?: string, configuration: ModuleConfiguration, environment: IEnvironment;
            Factory: Factory, cache?: Cache, helpers?: {[key:string]: any}, userData?:{[key:string]: unknown}
        }
    ) {
        this.environment = environment
        this.moduleId = moduleId ? moduleId : uuidv4()
        this.configuration = configuration
        this.Factory = Factory
        this.helpers = helpers ? helpers : {}
        this.cache = cache ? cache : new Cache()
        this.userData = userData ? userData : {}

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
    getPersistentData<TPersistentData>() : TPersistentData{
        return this.configuration.data as TPersistentData
    }

    /**
     * Add an input to the module.
     * 
     * @param id id - usually a meaningful name that is not shared with other inputs/outputs. 
     * If not provided, 'input' is used.
     * > ❕ if multiple inputs are added you need to provide an id to them
     * @param description description of the process triggered by the input when incoming data
     * comes in. If not provided, 'no description available' is used.
     * @param contract The [[contract]]: defines pre-conditions and data normalization in order
     * to reach the triggered process
     * @param onTriggered The callback triggered when a message reach the input
     */
    addInput({ id, description, contract, onTriggered }
        :{
            id?: string, 
            description?:string, 
            contract: IExpectation<unknown>, 
            onTriggered : ({data, configuration, context}, {cache: Cache}) => void
        }
        ){
        id = id || 'input'
        description = description || 'no description available'
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
     * @param id  id - usually a meaningful name that is not share with other inputs/outputs.
     * If not provided 'output' is used.
     * @returns A pipe that allows to emit data
     */
    addOutput<T>({id} : {id: string} = {id:'output'}): Pipe<T> {

        let obs$ = new ReplaySubject<{ data: T, configuration?:Object, context?: Context }>(1)
        let piped = obs$.pipe(
            map(({ data, context, configuration }:{data: T, context?: Context, configuration?:Object}) => {
                context && context.info && context.info('emit output', data)
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
    addJournal( { title, entryPoint, abstract } : {title: string, abstract?: string, entryPoint: Context}) {

        this.journals = this.journals
        .filter( j => j.title != title)
        .concat([new Journal({title, abstract, entryPoint})])
    }

    private newInputSlot({id, description, contract, onTriggered }:
        {id: string, description:string, contract: IExpectation<unknown>, onTriggered}
        ){

        return new InputSlot(
            id, 
            this.moduleId, 
            {description, contract},
            ({ connection, message }: { connection: Connection, message: any }) => {
                try{
                    this.processInput(onTriggered, { connection, message, slotId:id }) 
                }
                catch(e){
                    console.error(e)
                }
            }
        )
    }

    private processInput(processDataFct, { connection, message, slotId}: { connection: Connection, message: any, slotId:string }) {

        let inputSlot = this.inputSlots.find( slot => slot.slotId == slotId)
        let f = processDataFct.bind(this)

        let context = new Context( 'input processing',  message.context || {},  this.logChannels ) 
        this.addJournal({
            title: `Execution triggered from input slot "${slotId}"`,
            entryPoint: context
        })
        context.info(
            `start processing function of module ${this.moduleId}`,
            { connection, 'raw input': message, slotId}
        )
        let adaptedInput = message

        if( connection && connection.adaptor ){
            adaptedInput = context.withChild(
                "execute adaptor" ,
                (ctx: Context) => {
                    return connection.adaptor.mappingFunction(message, this.helpers)
                })
            context.userContext = adaptedInput.context || {}
        }
        
        let conf = this.configuration.data

        if (adaptedInput.configuration) {
            conf = context.withChild(
                "merge configuration" ,
                (ctx: Context) => {
                    let status = mergeConfiguration(conf, adaptedInput.configuration)

                    if(status instanceof InconsistentConfiguration)
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
                data: message.data,
                configuration: message.configuration,
                context: message.context
            },
            adaptedInput: adaptedInput,
            conf: conf,
            this: this
        })

        let contract = inputSlot.contract

        let resolution = context.withChild( 
            'resolve contract' , 
            (ctx) => {
                let resolution = undefined
                try{
                    resolution = contract.resolve(adaptedInput.data, ctx)
                }
                catch(error){
                    let mdleError =  new ModuleError(
                        this,
                        `Error while resolving input contract: ${error.message}`)
                    mdleError.stack = error.stack
                    throw mdleError
                }
                if(resolution.succeeded)
                    ctx.info('resolved expectations', resolution)
                if(!resolution.succeeded)
                    throw new ContractUnfulfilledError(
                        this,
                        `The contract of the input "${slotId}" has not been Fulfilled.`, resolution
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
                try{
                    return f( {...input, ...{context: ctx} }, {cache: this.cache} )
                }
                catch(error){
                    let mdleError =  new ModuleError(this, error.message)
                    mdleError.stack = error.stack
                    throw mdleError
                }
            }
        )
    }
}

/**
 * ## HostActionRequest
 * 
 * Base class for sending command to the host environment.
 */
export class HostCommandRequest{}

/**
 * ## UpdateConfigurationCommand
 * 
 * A command to send a signal to the host application requesting an update 
 * of the configuration for the target module.
 */
export class UpdateConfigurationCommand extends HostCommandRequest{

    /**
     * 
     * @param module target module
     * @param configuration updated configuration
     */
    constructor(
        public readonly module: ModuleFlux,
        public readonly configuration: ModuleConfiguration
        ){ super() }
}

/**
 * ## ModuleRendererBuild
 * 
 * This class is used to generate the view of the module in the builder panel.
 * 
 * > 🤓 These views are SVG elements, every modules have an associated *group* element
 * in the builder's canvas with id equal to the [[ModuleFlux.moduleId]]. The group's children
 * not only define the appearance of the module, but also its actions that can be triggered 
 * from the canvas.
 * 
 * ModuleRendererBuild implements a default view generating a kind of 'box' including a user-defined
 * icon and featuring the appropriate number of inputs and outputs. 
 * This is what the decorator [[BuilderView]] allows at the first place.
 *  
 * ### Implementing a custom view
 * 
 * The simplest way to create custom view is to use the [[BuilderView]] decorator by
 * providing a custom *render* function.
 * For instance:
 * 
 * ```typescript
 * @BuilderView({
 *       namespace:      ModuleNamespace,
 *       render :        (mdle: ModuleFlux) => customRenderFunction( mdle , ModuleNamespace)
 *   })
 * class Module extends ModuleFlux{
 *      //...
 * }
 * 
 * // somewhere in the code:
 * function customRenderFunction(mdle: ModuleFlux, factory: Factory){
 *      const renderingGroup = document.createElementNS("http://www.w3.org/2000/svg", "g")
 *      // create your custom view in the renderingGroup 
 *      // e.g. by appending element with renderingGroup.appendChild()
 *      return renderingGroup
 * }
 * ```
 * You can get inspiration or use the function [[genericModulePlot]].
 * 
 * A usual need when creating a custom view is to be able to interact with the configuration of the module.
 * For such case you can use the [[Environment.hostCommandRequest$]] pipeline (accessible from [[ModuleFlux.environment]])
 *  to send [[UpdateConfigurationCommand]] commands:
 * 
 * ```typescript
 * function customRenderFunction(mdle: ModuleFlux, factory: Factory){
 *      const renderingGroup = document.createElementNS("http://www.w3.org/2000/svg", "g")
 * 
 *      renderingGroup.onclick =  (event: MouseEvent) => {
 *          let actualConfiguration = mdle.configuration
 *          // anything of the conf. including 'PersistentData' can be updated
 *          let newConf = new Factory.Configuration( 
 *              {...actualConfiguration, ...{title:'updated title}}
 *          )
 *          let cmd = new UpdateConfigurationCommand(mdle, newConf)
 *          mdle.environment.hostCommandRequests$(cmd) 
 *      }
 *      return renderingGroup
 * }
 * ```
 * 
 * > 🧐 Another approach to define a custom view (usually in case you need to persist a state)
 * > is to include a class called *BuilderView* inheriting from [[ModuleRendererBuild]]
 * > into the module namespace and override the [[render]] method. 
 * > In that case, **do not** use the [[BuilderView]] decorator.
  */
export abstract class ModuleRendererBuild {

    /**
     * [[Factory]] of the module
     */
    public readonly Factory: Factory

     /**
     * Cache store for the module's icons
     * 
     * @param icon original content
     * @param content svg content including transform
     * @param transforms the transform part for appropriate rescaling
     */
    static iconsFactory : {[key:string]: {
        icon: string,
        iconNormalized: {
            content: string,
            transforms: string
        }
    }} = {}
    
    /**
     * 
     * @param svgIcon innerHTML section of a svg content
     * @param Factory [[Factory]]
     * @param environment module's environment
     */
    constructor({ svgIcon, Factory }: { svgIcon: string, Factory: Factory }) {

        this.Factory = Factory

        if (!ModuleRendererBuild.iconsFactory[Factory.uid])
            ModuleRendererBuild.iconsFactory[Factory.uid] = { icon: svgIcon, iconNormalized: undefined }
    }

    /** Return the svg content (aka icon) normalized to fit the module's 
     * box of the builder view (100 x 100 pixels).
     */
    icon() : { content: string, transforms: string } {

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

    /**
     * Create the SVG element representing the module in the builder panel.
     * 
     * See [[genericModulePlot]]
     * 
     * @param module target module
     * @param module target module
     * @returns the associated SVG element
     */
    render(module: ModuleFlux) : SVGElement{
        return genericModulePlot({
            module: module,
            icon: this.icon(),
            width: 150,
            vMargin: 50,
            vStep: 25
        }) 
    }
}


/**
 * ## ModuleRendererRun
 *  
 * 
 * Rather that using the decorator [[RenderView]], it is possible to define the view
 * by including a class called *RenderView* inheriting from [[ModuleRendererRun]]
 * into the module namespace. One use-case is a need to persist some state related to view.
 * 
 * This is illustrated in the next example: the module's outputs are accumulated in the view over time,
 * and a selection from the view of one item trigger re-emission.
 * 
 * ```typescript
 * import {render, children$} from '@youwol/flux-view'
 * 
 * namespace MyModule{
 * 
 *      @Flux(...)
 *      @BuilderView(...)
 *      // Do not use @RenderView(...)
 *      class Module extends ModuleFlux{
 * 
 *          output$ : Pipe<number>
 *          // in a real scenario, we would need to take care about context here
 *          selectValue( value: number) { this.output$.next({data: value}) }
 * 
 *          // ...
 *      } 
 * 
 *      class RenderView extends ModuleRendererRun<Module>{
 *          
 *          public readonly accItems$ : Observable<Array<number>>
 * 
 *          constructor(module: Module, wrapperDivAttributes) {
 *              super(module, wrapperDivAttributes)                  
 *              // scan: accumulate an observable emission overtime
 *              this.accItems$ = module.result$.pipe(scan( acc,e )=>[...acc,e], [])
 *          }
 * 
 *          render() {
 *              
 *              let view = (item, itemsCount, i) => ({ 
 *                   class: i == itemsCount -1 ? 'text-primary' : 'test-secondary'
 *                   innerText: String(item),
 *                   onclick: (ev: MouseEvent) => this.module.selectValue(item)) 
 *              }) * 
 *              return {
 *                  children: children$(
 *                      this.accItems$,
 *                      (items) => items.map( (item, i) => view(item, items.length, i),
 *                      { untilFirst: [{innerText:"No output emitted yet"}] }
 *                  )
 *              }
 *          }
 *      }
 * }
 * ``` 
 * 
 */
export abstract class ModuleRendererRun<T extends ModuleFlux> {

    /**
     * 
     * @param module the module to render
     * @param wrapperDivAttributes The view of a module is always encapsulated in Flux in a
     * wrapper div; *wrapperDivAttributes* allows to add classes or set style on this div.
     * For instance, a view of type 3D viewer will likely want to 
     * apply a {width:'100%'; height:'100%'} to the wrapper div of the 3D viewer.
     * 
     * > This wrapper div attributes is most likely an artifact of the rendering mechanism in Flux.
     * > Hopefully it will disappear at some point.
     * 
     */
    constructor(
        public readonly module: T, 
        public readonly wrapperDivAttributes: (module: ModuleFlux) => { class?: string, style?:{[key:string]: string}} ) { }

    /**
     * rendering function of the module
     */
    abstract render() : HTMLElement | HTMLElement[]
}

/**
 * ## PluginFlux
 * 
 * Base class for plugins in Flux: a [[ModuleFlux]] that can interact with a parent module.
 * 
 * All the rules/usages of [[ModuleFlux | modules]] also apply here.
 * The difference with a module is that plugins implementation, constructor or 
 * methods, can make use of the parent module.
 * 
 * > ❕ Do not forget to provide the compatibility function regarding the parent module in the 
 * > [[Flux]] decorator.
 * 
 * ### Do not forget to cleanup you stuffs 😬
 * 
 * It is common that the plugin has some side effect(s) on its the parent module,
 * in this case the plugin need to implement the [[SideEffects]] trait.
 * Indeed the parent module can outlive the plugin in flux application:  
 * a proper definition of [[SideEffects.apply]] and [[SideEffects.dispose]]
 * is needed for flux to properly work.
 * 
 * @param T type of the parent module
 */
export class PluginFlux<T extends ModuleFlux> extends ModuleFlux {

    readonly parentModule : T = undefined

    constructor(paramsDict: any) {
        super(paramsDict)
        this.parentModule = paramsDict.parentModule
    }
}

/**
 * ## WorkflowDependantTrait
 * 
 * Interface for modules that required information on the global workflow. 
 */
export interface WorkflowDependantTrait{

    applyWorkflowDependantTrait(workflow: Workflow)
}
export function implementsWorkflowDependantTrait(mdle: unknown): mdle is WorkflowDependantTrait {
    return (mdle as WorkflowDependantTrait).applyWorkflowDependantTrait !== undefined;
}


/**
 * ## SideEffects
 * 
 * Interface for a side effect trait. 
 */
export interface SideEffects {

    /**
     * trigger the application of the side effect(s)
     */
    apply()

    /**
     * cancel the application of the side effect(s)
     */
    dispose()
}

export function instanceOfSideEffects(object: any): object is SideEffects {

    let obj = object as SideEffects
    return obj.apply !== undefined && obj.dispose !== undefined
}


/**
 * ## Adaptor
 * 
 * An adaptor transforms an incoming [[Message | message]] reaching a [[ModuleFlux | module]]
 * just before it gets injected in the input's *onTriggered* callback.
 * 
 * It maps a [[Message]] to a [[Message]] and can act on any of the *data*, 
 * *configuration* or *context* parts.
 * 
 * 
 * ### Data part: adjusting module intercommunication 🗣
 * 
 * Transforming the data is common when the output of a source module is not exactly 
 * what expect the destination module. It can be for instance that the source module
 * emit a data of type ```{value: number}``` while the destination is expecting a straight ```number```.
 * In this case the adaptor would be:
 * 
 * ```typescript
 * // The incoming message is provided as argument, 
 * // the function returns the outgoing message, 
 * // the one interpreted by the destination module 
 * ({data, context}) => {
 *      return {
 *          data: data.value,
 *          context: context // discuss a bit latter
 *      }
 * } 
 * ```
 * 
 * ### Configuration part: let's enable **dynamic configuration** 🤘
 * 
 * Transforming the configuration is used to provide to the destination module 
 * a **dynamic configuration**.
 * This use case of adaptor is described in details [[ModuleConfiguration | here]].
 * 
 * ### Context part: long distance communication ∿
 * 
 * 
 * The context part of a message is called **user-context**.
 * It vehicles information that the builder of a Flux app wants to be broadcasted along the
 * data flow of the application.
 * It is used as an append-only dictionary of values, and gets transferred from modules to modules
 * automatically (to some extends). 
 * 
 * An example of a use case: in an application a file (whatever it is)
 * is loaded from a drive, some computations are done from it, maybe some user interactions,
 * and at latter point in the data flow an updated content need to be saved **on the same original file**.
 * 
 * The schematic code:
 * 
 * ```typescript
 * let branch = ['|~drive~|--|~filePicker~|---=A|~computer~|--...--=B|~fileSaver~|']
 * 
 * let modules = instantiateModules({...}) 
 * 
 * let adaptors    = {
 *     A : ({data,context}) => ({
 *             data, //<- data is forwarded
 *             // the filename is saved for latter
 *             context: { originalFile: data.file.name},
 *         }),
 *     B : ({data,context}) => ({
 *             data, //<- data is forwarded 
 *             // we recover and use the saved variable
 *             configuration: { filename: context.originalFile },
 *      })
 * }
 * ``` 
 * In the adaptor **A** the information *data.file.name* is available, it is saved in the context.
 * Latter on, in adaptor **B** this information is reused to provide the *configuration.filename* to the module
 * **fileSaver**.
 * 
 * ## Helpers
 * 
 * The modules can provide [helpers](./core_concepts.moduleflux.html#helpers) (functions, data or whatever)
 * that relates to their processing and may be useful to expose to the consumer.
 * Adaptors take as second argument the helpers (if any) provided by the associated module,
 * the full signature of an adaptor is .
 * 
 *```typescript
 * ( {data, configuration, context}, helpers) => {...}
 * ```
 * 
 * The helpers available for a module and their description should have been made 
 * available by the developer of the flux-pack. 
 */
export class Adaptor {

    public readonly mappingFunction :  (Message, helpers: {[key:string]: any}) => Message 

    private readonly asString: string

    /**
     * @param adaptorId unique id of the adaptor
     * @param mappingFunction the mapping function, either the string content of the mappingFunction
     * or directly the mapping function
     */
    constructor(
        public readonly adaptorId: string,
        mappingFunction: string | ((Message, helpers: {[key:string]: any}) => Message )) {

        this.mappingFunction = typeof(mappingFunction) == 'string'
            ? new Function(mappingFunction)()
            : mappingFunction

        this.asString = typeof(mappingFunction) == 'string'
            ? mappingFunction
            : String(mappingFunction)
    }

    /** 
     * @returns mapping function as string
     */
    toString() : string {
        return this.asString
    }
}


/** 
 * ## ModuleError
 * 
 * The base class of Error reported by a [[ModuleFlux | Module]].
 * 
 * > ❕ Inside a module, raised errors should inherit from this class.
 * > It is important to get an appropriate reporting within Flux applications.
 * 
*/
export class ModuleError extends Error {

    /**
     * 
     * @param module module in which the error occurred
     * @param params parameters forwarded to the parent class constructor 
     */
    constructor(
        public readonly module: ModuleFlux, 
        ...params) {

        super(...params)
        // @ts-ignore
        if(Error.captureStackTrace) {
            // @ts-ignore
            Error.captureStackTrace(this, ModuleError);
          }
        this.name = 'ModuleError';
    }
}

/** 
 * ## ConfigurationError
 * 
 * Errors related to configuration invalidation, see [[mergeConfiguration]].
 * 
 * Those errors are for instance emitted by [[ModuleFlux]] when starting to process incoming messages:
 * if the validation fails, the processing is interrupt. 
 * The error is then exposed in [[Environment.errors$]] (in flux applications this channel is plugged to a notifier).
 * 
 */
export class ConfigurationError extends ModuleError{

     /**
     * 
     * @param mdle module in which the error occurred
     * @param message a message (e.g. context of the error)
     * @param status returned value of [[mergeConfiguration]] when failed 
     */
    constructor(
        module: ModuleFlux, 
        message:string, 
        public readonly status:InconsistentConfiguration<any>
        ){
        super(module, message)
    }
}



/** 
 * ## ConfigurationError
 * 
 * Errors related to [[Contract | contract]] resolution when some of its expectation are
 * not fulfilled, see [[contract]].
 * 
 * Those errors are for instance emitted by [[ModuleFlux]] when starting to process incoming messages:
 * if the resolution fails, the processing is interrupt. 
 * The error is then exposed in [[Environment.errors$]] (in flux applications this channel is plugged to a notifier).
 * 
 */
export class ContractUnfulfilledError extends ModuleError{

     /**
     * 
     * @param mdle module in which the error occurred
     * @param message a message (e.g. context of the error)
     * @param status returned value of [[Contract.resolve]] when failed 
     */
    constructor(
        module: ModuleFlux,
        message: string, 
        public readonly status: ExpectationStatus<unknown>
        ){
        super(module, message)
    }
}
