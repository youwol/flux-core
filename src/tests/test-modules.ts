import { Schema, Property, ModuleFlux, Pipe, Cache, ValueKey, PluginFlux, Flux, BuilderView, RenderView, createHTMLElement} from "../index"
import { Subject, ReplaySubject } from 'rxjs';
import { map } from 'rxjs/operators';
import { freeContract } from "../lib/models/contract";
import { Context } from "../lib/models/context";
import { testPack } from "../lib/modules/test-modules";


console.log = () =>{}
export namespace Schemas{

    @Schema({
        pack: testPack,
        description: "Input type"
    })
    export class Input {

        @Property({ description: "a number" })
        readonly value: number

        constructor({value}){
            this.value = value
        }
    }

    @Schema({
        pack: testPack,
        description: "Output type"
    })
    export class Output {

        @Property({ description: "a number property" })
        readonly value: number

        constructor({value}){
            this.value = value
        }
    }
}

export namespace ModuleTest{
        
    @Schema({
        pack: testPack,
        description: "PersistentData for ModuleTest"
    })
    export class PersistentData{
        constructor() {
        }
    }
    @Flux({
        pack: testPack,
        namespace: ModuleTest,
        id: "ModuleTest",
        displayName: "ModuleTest",
        description: "A test module"
    })
    @BuilderView({
        namespace: ModuleTest,
        icon: ""
    })
    export class Module extends ModuleFlux{

        static dataReceived$ = new Subject()
        readonly output$ : Pipe<Schemas.Output>

        constructor(params){ 
            super(params)    
            
            this.addInput({
                id:"input", 
                description: "",
                contract: freeContract(),
                onTriggered: this.square
            })

            this.output$ = this.addOutput<Schemas.Output>({id:"output"})
        }

        square({data, configuration, context}, {cache} : {cache:Cache} ){
            console.log("azazaz")
            let [d, fromCache] = cache.getOrCreate(new ValueKey("value",data.value), () => new Schemas.Output( {value:data.value*data.value} ) )
            Module.dataReceived$.next({moduleId:this.moduleId, data:data})
            context.withChild(
                "send with updated user's context",
                (context) => this.output$.next({ data:d, context}),
                {fromCache}
            )
        }
    }
}

export namespace PluginTest{
        
    @Schema({
        pack: testPack,
        description: "PersistentData for PluginTest"
    })
    export class PersistentData{
        constructor() {
        }
    }
    @Flux({
        pack: testPack,
        namespace: PluginTest,
        id: "PluginTest",
        displayName: "PluginTest",
        description: "A test plugin"
    })
    @BuilderView({
        namespace: PluginTest,
        icon: ""
    })
    export class Module extends PluginFlux<ModuleTest.Module>{

        readonly output$ : Pipe<Schemas.Input>

        constructor(params){ 
            super(params)    
            
            this.addInput({
                id:"input",
                description:"",
                contract: freeContract(),
                onTriggered: this.square
            })

            this.output$ = this.addOutput({id:"output"})
        }

        square(
            {data, configuration, context} : {data: Schemas.Input, configuration: PersistentData, context: Context}
            , {cache} : {cache:Cache}
            ){
            
            let [d, fromCache] = cache.getOrCreate(
                new ValueKey("value",data.value), 
                () => new Schemas.Output( {value:data.value*data.value} ) 
            )
            context.withChild( 
                "send output with updated user's context", 
                () => { this.output$.next({ data:d, context })}, 
                {fromCache}
            )
        }
    }
}


/**
 */
export namespace DropDown{
    export let defaultConfigItems = `
return [{text: "option 1", value: { n : 0 }},
        {text: "option 2",value: { n : 1 }}]
`
    @Schema({
        pack: testPack,
        description: "PersistentData for DropDown"
    })
    export class PersistentData {

        @Property({ description: "text on the widget" })
        text : string

        @Property({ description: "index selected" })
        selectedIndex : number


        @Property({ 
            description: "items",
            type: "code" })
        items : string

        constructor({text, items,selectedIndex } :{text?:string, items?: string, selectedIndex?:number}= {}) {

            this.text = (text != undefined) ? text : "select"
            this.items = (items != undefined) ? items : defaultConfigItems
            this.selectedIndex = (items != undefined) ? selectedIndex : 0
        }

        getItems() {
            return typeof(this.items)=='string' ? new Function(this.items)() : this.items
        }
    }


    @Flux({
        pack: testPack,
        namespace: DropDown,
        id: "DropDown",
        displayName: "DropDown",
        description: "A drop down menu"
    })
    @BuilderView({
        namespace: DropDown,
        icon: ""
    })
    @RenderView({
        namespace: DropDown,
        render: (mdle) => renderHtmlElement(mdle)
    })
    export class Module extends ModuleFlux {
        
        selection$ : any

        constructor( params ){
            super(params) 

            let conf : any = this.getConfiguration()
            let items = conf.getItems()

            this.selection$ = this.addOutput({id:"selection"} )
            this.selection$.next({data: items[conf.selectedIndex].value})
        }

        select( value:string ) {   
            this.selection$.next(  {data: value} )
        }
    }


    //-------------------------------------------------------------------------
    //-------------------------------------------------------------------------

    function renderHtmlElement(mdle: Module) {
        let conf  : any = mdle.getConfiguration()
        let div = <HTMLDivElement>(document.createElement('div'))
        let select = <HTMLSelectElement>(document.createElement('select'))
        div.appendChild(select)
        let items = conf.getItems()

        items.forEach( item =>{
            let option = <HTMLOptionElement>(document.createElement('option'))
            option.classList.add("dropdown-item")
            option.innerHTML = item.text
            option.value = item.text
            select.appendChild(option)
        })
        select.selectedIndex = conf.selectedIndex
        select.onchange = ( ) => mdle.select(items[select.selectedIndex].value)   
        
        return div
    }
}


export namespace Console {

    @Schema({
        pack: testPack,
        description: "PersistentData for Console"
    })
    export class PersistentData {

        @Property({ description: "log prefix" })
        readonly prefix : string

        constructor( {prefix} = {prefix: "Console Module"}) {
            this.prefix = prefix
        }
    }

    @Flux({
        pack:           testPack,
        namespace:      Console,
        id:             "Console",
        displayName:    "Console",
        description:    "To log in the debug console"
    })
    @BuilderView({
        namespace:      Console,
        icon:           ""
    })
    export class Module extends ModuleFlux {
        
        constructor(params){ 
            super(params)                        
            this.addInput({
                id:"message", 
                description: "",
                contract: freeContract(),
                onTriggered: ({data, configuration, context} ) => 
                    console.log(configuration.prefix, {data,configuration,context}) 
            })
        }
    }

}



/**
 */
export namespace Label{
    
    @Schema({
        pack: testPack,
        description: "PersistentData for Label"
    })
    export class PersistentData {

        @Property({ description: "text on the label" })
        text : string

        constructor({text} :{text?:string}= {}) {
            this.text = (text != undefined) ? text : "default-text"
        }
    }


    @Flux({ pack: testPack, namespace: Label, id: "Label", displayName: "Label", description: "Label" })
    @BuilderView({ namespace: Label, icon: ""})
    @RenderView({ namespace: Label,
        render: (mdle) => renderHtmlElement(mdle)
    })
    export class Module extends ModuleFlux {
        
        value$ : any
        display$ = new ReplaySubject<string>()

        constructor( params ){
            super(params) 

            this.addInput({ id: "value", description:"", contract: freeContract(), onTriggered: this.set })

            this.value$ = this.addOutput({id:"value"})
            //this.set(this.getConfiguration<PersistentData>().text)
        }

        set( {data , configuration, context} ) {   
            this.display$.next(data.value)
            this.value$.next(  {data, configuration, context})
        }
    }


    //-------------------------------------------------------------------------
    //-------------------------------------------------------------------------

    function renderHtmlElement(mdle: Module) {
       
        let subscriptions = []
        let view = createHTMLElement({
            data: {
                __label: mdle.display$.pipe( map( (text) =>{
                    return { innerHTML: text}
                }))
            },
            subscriptions,
            classesDict: {
                "btn-active":               "btn btn-outline-primary mx-2",
                "btn-inactive":             "btn btn-outline-secondary mx-2"
            }
        });

        return view
    }
}

