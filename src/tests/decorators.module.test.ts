import { Schema, Property, Flux, BuilderView, RenderView } from "../index"
import { FluxPack, ModuleFlux } from '../lib/models/models-base';

console.log = () =>{}

let pack = new FluxPack({
    name:"my-pack",
    description: "",
    version: "0.0.0"
})

@Schema({
    pack: pack,
    description: "A simple properties class"
})
export class PropertiesClass {

    @Property({ description: "a string property" })
    readonly strProp: string

    @Property({ description: "a number property" , type: 'float', default:0})
    readonly numberProp: number

}

export namespace MyModule {

    export class PersistentData extends PropertiesClass{
        constructor() {
            super()
        }
    }


    @Flux({
        pack:           pack,
        namespace:      MyModule,
        id:             "MyModule",
        displayName:    "My Module",
        description:    "A Module"
    })
    @BuilderView({
        namespace:      MyModule,
        icon:           "<g id='mymodule-svg-icon' ></g>"
    })
    @RenderView({
        namespace: MyModule,
        render: (mdle) => { 
            let r = <HTMLDivElement>(document.createElement('div')) ; r.id=mdle.moduleId; return r}
    })
    export class Module extends ModuleFlux {

        constructor(params){ super(params)}
    }
}

//-----------------------------------------------------------------------------
//-----------------------------------------------------------------------------

test('MyModule', () => {

    let factory = pack.getFactory('MyModule')
    expect(factory).toBeDefined()  
    
    expect(factory.displayName).toEqual("My Module")    
    expect(factory.id).toEqual("MyModule")         
    expect(factory.isPlugIn).toEqual(false)         
    expect(factory.packId).toEqual("my-pack")      
    expect(factory.uid).toEqual("MyModule@my-pack")       

    expect(factory.PersistentData).toBeDefined()     
    expect(factory.Module).toBeDefined()         
    expect(factory.RenderView).toBeDefined()     
    expect(factory.BuilderView).toBeDefined()       
    expect(factory.Configuration).toBeDefined()        
    

    let configuration = new factory.Configuration()
    let confData = new factory.PersistentData()
    expect(confData).toBeDefined() 
    let builderView = new factory.BuilderView()
    expect(builderView.icon).toBeDefined() 
    expect(builderView.render).toBeDefined() 
    let icon =  builderView.icon()

    expect(icon.content.includes("mymodule-svg-icon")).toBeTruthy() 
    expect(icon.transforms).toBeDefined() 

    let moduleId= 'toto'
    let environment = {}
    let mdle = new factory.Module( { moduleId, configuration, MyModule, environment })

    expect(mdle).toBeDefined()     
    let renderView = new factory.RenderView(mdle)
    expect(renderView.render).toBeDefined() 

    let rendered = renderView.render()
    expect(rendered.nodeName).toEqual("DIV")
    expect(rendered.id).toEqual("toto")
})


//-----------------------------------------------------------------------------
//-----------------------------------------------------------------------------

export namespace MyModule2 {

    export class PersistentData extends PropertiesClass{
        constructor() {
            super()
        }
    }


    @Flux({
        pack:           pack,
        namespace:      MyModule2,
        id:             "MyModule2",
        displayName:    "My Module2",
        description:    "A Module2"
    })
    @RenderView({
        namespace: MyModule2,
        render: (mdle) => `<div id='${mdle.moduleId}' ></div>`
    })
    export class Module extends ModuleFlux {

        constructor(params){ super(params)}
    }
}

test('MyModule2', () => {

    let factory = pack.getFactory('MyModule2')
    expect(factory).toBeDefined()  
    
    let moduleId= 'tutu'
    let environment = {}
    let configuration = new factory.Configuration()
    let mdle = new factory.Module( { moduleId, configuration, MyModule, environment })

    let renderView = new factory.RenderView(mdle)

    let rendered = renderView.render()
    expect(rendered.nodeName).toEqual("DIV")
    expect(rendered.firstChild.id).toEqual("tutu")
    
})

//-----------------------------------------------------------------------------
//-----------------------------------------------------------------------------

export namespace MyModule3 {

    export class PersistentData extends PropertiesClass{
        constructor() {
            super()
        }
    }


    @Flux({
        pack:           pack,
        namespace:      MyModule3,
        id:             "MyModule3",
        displayName:    "My Module3",
        description:    "A Module3"
    })
    @BuilderView({
        namespace:      MyModule3,
        icon:           "<g id='mymodule-svg-icon' ></g>",
        render:         (mdle) => { let r = document.createElementNS("http://www.w3.org/2000/svg", "rect"); r.id = mdle.moduleId; return r }
    })
    export class Module extends ModuleFlux {

        constructor(params){ super(params)}
    }
}

test('MyModule3', () => {

    let factory = pack.getFactory('MyModule3')
    expect(factory).toBeDefined()  
    
    let moduleId= 'titi'
    let environment = {}
    let configuration = new factory.Configuration()
    let mdle = new factory.Module( { moduleId, configuration, MyModule, environment })

    let builderView = new factory.BuilderView()

    let rendered = builderView.render(mdle)
    expect(rendered.nodeName).toEqual("rect")
    expect(rendered.id).toEqual("titi")
    
})