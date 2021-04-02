import {AUTO_GENERATED} from '../auto_generated'
import { Context, ErrorLog } from '../lib/module-flow/context'
import { expectAnyOf, expectAttribute, expect as expect_, expectCount, ContractUnfulfilledError } from '../lib/module-flow/contract'
import { BuilderView, Flux, Property, RenderView, Schema } from '../lib/module-flow/decorators'
import { FluxPack, ModuleFlow, Pipe } from '../lib/module-flow/models-base'
import { instantiateModules, parseGraph } from '../lib/simple-parser/parser'
import { Runner } from '../lib/simple-parser/runner'
import { attr$, render } from "@youwol/flux-view"
import { Console, DataEmitor } from './test-modules'
import { Subject } from 'rxjs'
import { renderTemplate } from '../lib/module-flow/render-html'
import { delay, filter, map, skip, take } from 'rxjs/operators'
import { ConfigurationError } from '..'
import { UnconsistentConfiguration } from '../lib/module-flow/configuration-validation'

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
 -    the definiton of the persistentData
 -    the definition of the core logic
 -    the definition of the view in the builder panel
 -    the definition of the rendering view
 
 On top of the classes/structures explicitely writted in it, the decorators are generating other
 required data in the namespace (that you don't need to care about).
 */
export namespace MyModule{

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
        namespace: MyModule,
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
        namespace: MyModule,
        icon: "<text> MyModule </text>"
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
        namespace: MyModule,
        render: (mdle: Module) => renderHtmlElement(mdle)
    })
    export class Module extends ModuleFlow {
        
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
        '--|~dataEmitor~|---|~myModule~|--'
    ] 

    let modules     = instantiateModules({
        dataEmitor: DataEmitor,
        myModule: MyModule
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
    modules.dataEmitor.emit({data:[5, 10]})

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
        modules.dataEmitor.emit({data:[5, 6], configuration:{operationType:MyModule.Operations.MULTIPLICATION}}) 
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
        modules.dataEmitor.emit({data:[{value:5}, 4], configuration:{operationType:MyModule.Operations.MULTIPLICATION}})
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
        '--|~dataEmitor~|---|~myModule~|--'
    ] 

    let modules = instantiateModules({
        dataEmitor: DataEmitor,
        myModule: MyModule
    }) 
    
    let graph = parseGraph( { branches, modules } )    
    new Runner( graph )  
    
    /**
     * module's input contract has not been designed to recognized 'five' as number
     */
    modules.dataEmitor.emit({data:['five', 10]})

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
        '--|~dataEmitor~|---|~myModule~|--'
    ] 

    let modules = instantiateModules({
        dataEmitor: DataEmitor,
        myModule: MyModule
    }) 
    
    let graph = parseGraph( { branches, modules } )    
    new Runner( graph )  

    /**
     * By sending a 'configuration', myModule's configuration will be dynamically updated
     * with the attributes provided (here one : 'operationType').
     * Here an error is inroduced: PersistentData.operationType can not take value 'division'
     */
    modules.dataEmitor.emit({data:[5, 10], configuration:{operationType:'division'}})

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
                error: "Got 'division' while expected values from enum are: addition,multiplication",
            })
        done()
    })
})
