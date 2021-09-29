import {AUTO_GENERATED} from '../auto_generated'
import { Context, ErrorLog } from '../lib/models/context'
import { expectAnyOf, expectAttribute, expect as expect_, expectCount } from '../lib/models/contract'
import { BuilderView, Flux, Property, RenderView, Schema } from '../lib/models/decorators'
import {  FluxPack, ModuleFlux, Pipe } from '../lib/models/models-base'
import { instantiateModules, parseGraph } from '../lib/simple-parser/parser'
import { Runner } from '../lib/simple-parser/runner'
import { attr$, render } from "@youwol/flux-view"
import { renderTemplate } from '../lib/models/render-html'
import { filter, map, skip, take } from 'rxjs/operators'
import { ConfigurationError, ContractUnfulfilledError } from '..'
import { ModuleDataEmittor } from '../lib/modules/test-modules'
console.log = () => {}
console.error = () => {}
/*
In this example we define a module that does operation on two numbers, either addition or multiplication.
It features one input that is expected to contains two numbers (implicit, this is explained latter)
and send the result (a number) as output.
*/

/* 
We need to declare the 'pack' that will contains the modules.
The variable AUTO_GENERATED gather the data needed, are extracted from the package.json file.
We can add here a step of installation to proceed to some initialization, i.e. to gather resources.
*/
let pack = new FluxPack(AUTO_GENERATED)

/*
 All the data related to one module are encapsulated in a namespace,
 it usually includes:
 -    the definition of the persistentData
 -    the definition of the core logic
 -    the definition of the view in the builder panel
 -    the definition of the rendering view

 On top of the classes/structures explicitly written in it, the decorators are generating other
 required data in the namespace (that you don't need to care about).

 Detailed documentation can be found in the
 [flux-core documentation](/api/assets-gateway/raw/package/QHlvdXdvbC9mbHV4LWNvcmU=/libraries/youwol/flux-core/latest/dist/docs/modules/lib_models_models_base.html)
 */
export namespace SimpleModule{
    
    export enum Operations{
        ADDITION= 'addition',
        MULTIPLICATION= 'multiplication'
    }
    let operationsFactory = {
        [Operations.ADDITION] : (d: [number, number]) => d[0] + d[1],
        [Operations.MULTIPLICATION] : (d: [number, number]) => d[0] * d[1],
    }

    /*
     * This section of code declares the persistent data of the module.
     * Within the builder's view of a *Flux* application, PersistentData can be:
     * -    updated using an auto-generated widget
     * -    persisted when the project is saved 
     * 
     * PersistentData can inherit from other classes (whose can also exposed properties)
     */
    @Schema({
        pack
    })
    export class PersistentData {

        /* The decorator 'Property' is used to declare an attribute that can be:
        * -    updated by the user in the builder view of a flux app
        * -    overided at run time (see in the tests below)
        * 
        * Basic types can be used, as well as custom classes (as long as they are decorated with 'Schema').
        */
        @Property({ 
            description: "operation type",
            enum: Object.values(Operations)
        })
        operationType : Operations

        /* Should the class have inherited from another one, the constructor would 
         * have been in the form:         
         * constructor({operationType,...rest} :{operationType?:Operations}= {}) {
         *     super(rest)
         *     // initialize owned properties
         * }
         */
        constructor({operationType} :{operationType?:Operations}= {}) {

            /*
             * operationType is set to addition by default 
             */
            this.operationType = (operationType != undefined) 
                ? operationType 
                : Operations.ADDITION
        }
    }

    /*
     * The next ~10 lines declares the contract of the input, from which we expect to retrieve two numbers.
     * One of the responsability of the developer is to try to be as flexible as possible in terms of 
     * acceptable data. Here we define a contract that can accept either directly a number 
     * or an object in the form *{value:number}*. 
     */
    let straightNumber = expect_<number>({
        description: `a straight number`,
        when: (inputData) => typeof (inputData) == 'number'
    })

    let permissiveNumber = expectAnyOf<number>({
        description: `an implicit number `,
        when: [
            straightNumber,
            expectAttribute({ name: 'value', when: straightNumber })
        ]
    })
    
    /* This decorator is used to include the module in 'pack' with some metadata,
     * namespace and pack are required
     */ 
    @Flux({
        pack: pack,
        namespace: SimpleModule,
        id: "MyModule",
        displayName: "My Module",
        description: "A module that does addition or multiplication :/ "
    })
    /* 
     * This decorator allows to define the view of the module in the builder panel.
     * An automatic view can be generated by providing a svg definition of an icon. 
     * The BuilderView can also be defined by a custom function that can interact 
     * with the module's configuration.
     */ 
    @BuilderView({
        namespace: SimpleModule,
        icon: `<g transform="translate(0 -1)"><g><g>
        <path d="M477.931,436.328h-26.089l-70.651-108.646l12.978-2.433c2.624-0.492,4.867-2.183,6.063-4.571l34.113-68.227l0.002-0.005     l0.018-0.035c0.454-0.922,0.738-1.919,0.837-2.942l0.03-0.104c0.022-0.239-0.077-0.45-0.075-0.685     c0.044-0.682,0.005-1.367-0.117-2.039l-21.649-92.102c40.156-1.935,72.015-34.53,73.032-74.72     c1.017-40.19-29.152-74.354-69.16-78.317c-40.007-3.963-76.293,23.618-83.181,63.227l-74.2-37.101     c-0.183-0.092-0.383-0.077-0.569-0.154c-0.284-0.133-0.576-0.25-0.873-0.35c-0.253-0.074-0.499-0.116-0.758-0.167     c-0.26-0.051-0.507-0.106-0.769-0.132c-0.282-0.018-0.565-0.022-0.847-0.011c-0.285-0.011-0.57-0.006-0.854,0.014     c-0.257,0.026-0.498,0.078-0.754,0.128c-0.266,0.051-0.517,0.094-0.777,0.17c-0.294,0.1-0.582,0.217-0.863,0.35     c-0.186,0.077-0.386,0.063-0.569,0.154L145.131,81.186V68.183c16.643-4.297,27.494-20.299,25.328-37.35S153.786,1,136.597,1     s-31.695,12.781-33.861,29.832c-2.166,17.051,8.685,33.053,25.328,37.35V89.72l-12.35,6.175     c-2.265,1.133-3.911,3.214-4.492,5.679L77.089,246.641c-0.119,0.667-0.158,1.346-0.115,2.023     c0.002,0.241-0.099,0.458-0.077,0.702l0.031,0.103c0.099,1.023,0.382,2.02,0.835,2.943l34.133,68.267     c1.195,2.388,3.438,4.079,6.063,4.571l12.98,2.434l-70.65,108.645H34.197c-9.422,0.009-17.057,7.645-17.067,17.067v25.6     c0,4.713,3.82,8.533,8.533,8.533h102.4c4.713,0,8.533-3.82,8.533-8.533v-25.6c-0.009-9.422-7.645-17.057-17.067-17.067h-4.757     l30.148-46.386l85.542,22.821v49.165h-17.067c-9.422,0.009-17.057,7.645-17.067,17.067v25.6c0,4.713,3.82,8.533,8.533,8.533     h102.4c4.713,0,8.533-3.82,8.533-8.533v-25.6c-0.009-9.422-7.645-17.057-17.067-17.067h-17.067v-49.165l85.542-22.821     l30.148,46.386h-4.757c-9.422,0.009-17.057,7.645-17.067,17.067v25.6c0,4.713,3.82,8.533,8.533,8.533h102.4     c2.263,0.001,4.434-0.898,6.035-2.499s2.499-3.771,2.499-6.035v-25.6C494.986,443.973,487.352,436.339,477.931,436.328z      M386.86,309.253l-21.263,3.987l-0.044,0.009l-55.688,10.442l28.651-74.545l74.987,6.817L386.86,309.253z M409.664,18.195     c32.99,0,59.733,26.744,59.733,59.733s-26.743,59.733-59.733,59.733c-32.99,0-59.733-26.744-59.733-59.733     C349.969,44.954,376.69,18.233,409.664,18.195z M333.138,83.34c2.497,34.816,28.141,63.577,62.443,70.035l20.132,85.652     l-75.812-6.862L315.61,118.807c-0.102-0.306-0.22-0.605-0.355-0.898c-0.116-0.368-0.259-0.728-0.425-1.077     c-0.101-0.204-0.132-0.434-0.249-0.63L278.459,56L333.138,83.34z M322.309,231.53l-132.497,0.029l21.949-102.431h88.605     L322.309,231.53z M256.064,51.847l36.129,60.214h-72.258L256.064,51.847z M119.531,35.261c0-9.426,7.641-17.067,17.067-17.067     s17.067,7.641,17.067,17.067s-7.641,17.067-17.067,17.067C127.176,52.318,119.54,44.683,119.531,35.261z M126.922,109.374     L233.669,56l-36.122,60.203c-0.117,0.195-0.148,0.426-0.249,0.63c-0.167,0.348-0.309,0.708-0.425,1.077     c-0.135,0.293-0.253,0.592-0.355,0.898L172.235,232.13l-75.821,6.893L126.922,109.374z M125.268,309.253l-26.649-53.296     l74.98-6.846l28.663,74.578l-55.683-10.441l-0.048-0.009L125.268,309.253z M119.531,453.395v17.067H34.197v-17.067H119.531z      M134.376,374.853l-0.006,0.01l-39.949,61.466H80.645l68.439-105.243l12.247,2.296L134.376,374.853z M154.707,374.887     l24.765-38.104l50.992,9.561v48.753L154.707,374.887z M298.731,478.995v17.067h-85.333v-17.067H298.731z M247.531,461.928     V349.545l6.954,1.304c0.512,0.094,1.032,0.142,1.553,0.143l0.018,0.003l0.009-0.001l0.009,0.001l0.018-0.003     c0.521,0,1.041-0.048,1.553-0.143l6.954-1.304v112.383H247.531z M256.064,333.777l-34.094-6.393l-30.286-78.793l128.771-0.028     l-30.297,78.821L256.064,333.777z M281.664,395.098v-48.753l50.992-9.561l24.765,38.104L281.664,395.098z M350.798,333.381     l12.244-2.295l68.445,105.242h-13.772L350.798,333.381z M477.931,470.461h-85.333v-17.067h85.333V470.461z"/>
        <path d="M409.664,112.061c18.851,0,34.133-15.282,34.133-34.133s-15.282-34.133-34.133-34.133     c-18.851,0-34.133,15.282-34.133,34.133C375.551,96.771,390.821,112.041,409.664,112.061z M409.664,60.861     c9.426,0,17.067,7.641,17.067,17.067s-7.641,17.067-17.067,17.067c-9.426,0-17.067-7.641-17.067-17.067     C392.608,68.507,400.243,60.872,409.664,60.861z"/>
        </g></g></g>`
    })
    /* 
    * This decorator allows to define a view in the rendering panel.
    * In the case of a 'processing' module (no rendering view associated),
    * this part is not included.
    *  The view is defined by a function that return a HTMLDivElement, 
    * there can be any interaction between the view and the module's logic
    * (altough not illustrated by this example).
    */
    @RenderView({
        namespace: SimpleModule,
        render: (mdle: Module) => renderHtmlElement(mdle)
    })
    export class Module extends ModuleFlux {
        
        result$ : Pipe<number>

        constructor( params ){
            super(params) 

            this.addInput({
                id:'input',
                description: 'trigger an operation between 2 numbers',
                contract: expectCount<number>( {count:2, when:permissiveNumber}),
                onTriggered: ({data, configuration, context}) => this.do(data, configuration, context)
            })
            this.result$ = this.addOutput({id:'result'})
        }

        /*
        * Thanks to the contract defined in the input, the type of the data that is passed
        * in the above 'onTriggered' function is known (here [number, number]).
        * 
        * Regarding the configuration, the instance passed is a merge between:
        * -   the default configuration as defined by the user 
        * -   the eventual attributes of the configuration that have been overide at run time
        * (e.g. using an adaptor)
        *
        * The context is essentially used in the function to report info, warning, errors,
        * timings, graphs, etc; a nice report is then accessible to the user to better
        * understand what happened in the process. 
        */
        do( data: [number, number], configuration: PersistentData, context: Context ) {

            let result = operationsFactory[configuration.operationType](data)
            context.info('Computation done', {result})
            this.result$.next({data:result,context})
        }
    }

    /**
     * This function defines how to render the module in the rendering panel.
     * Here we use a label to display the last result computed.
     * 
     * Any framework, if need be, can be used here (as long as a HTMLElement is returned).
     * We find @YouWol our library https://github.com/youwol/flux-view particularly suited
     * to define view within flux applications.
     */
    export function renderHtmlElement(mdle: Module) : HTMLElement {
        
        return render({
            tag: 'label',
            id: 'my-module-label-id', // <- to facilitate testing
            /* 'attr$' bind an HTML's attributes (here innerText) 
             * to a rxjs observable (here the module output mdle.result$).
             */
            innerText: attr$(
                mdle.result$,
                ({data}) => {
                    return `The last computed result is: ${data}`
                }
            )
        })
    }
}

/*
* Test with valid inputs
*
* The library includes a simple parser to write a graph (as would it be done in a flux application).
* In the follwong tests we use a simple graph of two connected modules:
* -    dataEmitor as upstream module to manually send data using dataEmitor.emit(...)
* -    myModule to test our code
*/
test('valid inputs', (done) => {
    
    let branches = [
        '--|~dataEmittor~|---|~myModule~|--'
    ] 

    let modules     = instantiateModules({
        dataEmittor: ModuleDataEmittor,
        myModule: SimpleModule
    }) 
    
    let graph       = parseGraph( { branches, modules } )
    
    new Runner( graph )  
    /*
    * Rendering of the application is done by inserting the view of the modules 
    * in their wrapped div with corresponding id.
    */
    let div = document.createElement("div")
    div.innerHTML = "<div id='myModule'> </div>"

    /*
    * When using flux-view, nothing will happend if you don't insert the div in the document
    * (observables are subscribed/unsubscribed when HTMLElement are added/removed from the document)
    */
    document.body.appendChild(div)
    renderTemplate(div, graph.workflow.modules)
    
    /**
     * Scenario 1: straight emission of two numbers, no configuration overloading (by default operationType is Operations.ADDITION)
     */
    modules.dataEmittor.emit({data:[5, 10]})

    modules.myModule.result$.pipe(
        take(1)
    ).subscribe( ({data}) => {

        // Test scenario 1

        expect(data).toEqual(15)
        let text = document.getElementById("my-module-label-id").innerText
        expect(text).toEqual("The last computed result is: 15")

        /**
         * Scenario 2: straight emission of two numbers, configuration overloaded to Operations.MULTIPLICATION
         * 
         * By sending a 'configuration', myModule's configuration will be dynamically updated
         * with the attributes provided.
         */
        modules.dataEmittor.emit({data:[5, 6], configuration:{operationType:SimpleModule.Operations.MULTIPLICATION}}) 
    })
    
    modules.myModule.result$.pipe(
        take(1)
    ).subscribe( ({data}) => {

        // Test scenario 2

        expect(data).toEqual(30)
        let text = document.getElementById("my-module-label-id").innerText
        expect(text).toEqual("The last computed result is: 30")
        
        /**
         * Scenario 3: emission of two numbers including an 'indirect' one, configuration overloaded to Operations.MULTIPLICATION
        */
        modules.dataEmittor.emit({data:[{value:5}, 4], configuration:{operationType:SimpleModule.Operations.MULTIPLICATION}})
    })

    modules.myModule.result$.pipe(
        take(1)
    ).subscribe( ({data}) => {

        // Test scenario 3

        expect(data).toEqual(20)
        let text = document.getElementById("my-module-label-id").innerText
        expect(text).toEqual("The last computed result is: 20")
        done()
    })    
})

/*
* This test illustrates what is happening to an input data that 
* do not respect the module's input contract.
*/
test('invalid data', (done) => {
    
    let branches = [
        '--|~dataEmittor~|---|~myModule~|--'
    ] 

    let modules = instantiateModules({
        dataEmittor: ModuleDataEmittor,
        myModule: SimpleModule
    }) 
    
    let graph = parseGraph( { branches, modules } )    
    new Runner( graph )  
    
    /**
     * module's input contract has not been designed to recognized 'five' as number
     */
    modules.dataEmittor.emit({data:['five', 10]})

    modules.myModule.logs$.pipe( 
        filter(log => log instanceof ErrorLog),
        map((errorLog: ErrorLog) => errorLog.error )
    ).subscribe( (error: Error) => {

        expect(error).toBeInstanceOf(ContractUnfulfilledError)
        // More info on the error are in error.status
        done()
    })
})

/*
* This test illustrates what is happening to an input data that 
* overides the module's default configuration in a wrong way.
*/
test('invalid configuration', (done) => {
    
    let branches = [
        '--|~dataEmittor~|---|~myModule~|--'
    ] 

    let modules = instantiateModules({
        dataEmittor: ModuleDataEmittor,
        myModule: SimpleModule
    }) 
    
    let graph = parseGraph( { branches, modules } )    
    new Runner( graph )  

    /**
     * By sending a 'configuration', myModule's configuration will be dynamically updated
     * with the attributes provided (here one : 'operationType').
     * Here an error is inroduced: PersistentData.operationType can not take value 'division'
     */
    modules.dataEmittor.emit({data:[5, 10], configuration:{operationType:'division'}})

    modules.myModule.logs$.pipe( 
        filter(log => log instanceof ErrorLog),
        map((errorLog: ErrorLog) => errorLog.error )
    ).subscribe( (error: Error) => {

        expect(error).toBeInstanceOf(ConfigurationError)

        if(error instanceof ConfigurationError) 
            expect(error.status.typeErrors[0]).toEqual({
                attributeName: "operationType",
                actualValue: "division",
                expectedType: "String",
                error: "Got 'division' while expected values from enum are: addition,multiplication.",
            })
        done()
    })
})

