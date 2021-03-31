import { Schema, Property, Method, Flux, BuilderView, RenderView } from "../index"
import { ModuleFlow } from '../lib/module-flow/models-base';

console.log = () =>{}

let pack : any = {
    id:"my-pack"
}

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
    export class Module extends ModuleFlow {

        constructor(params){ super(params)}
    }
}

//-----------------------------------------------------------------------------
//-----------------------------------------------------------------------------

test('MyModule', () => {

    expect(pack.modules.MyModule).toBeDefined()  
    let m = pack.modules.MyModule
    expect(m.displayName).toEqual("My Module")    
    expect(m.id).toEqual("MyModule")         
    expect(m.isPlugIn).toEqual(false)         
    expect(m.packId).toEqual("my-pack")      
    expect(m.uid).toEqual("MyModule@my-pack")       

    expect(m.PersistentData).toBeDefined()     
    expect(m.Module).toBeDefined()         
    expect(m.RenderView).toBeDefined()     
    expect(m.BuilderView).toBeDefined()       
    expect(m.Configuration).toBeDefined()        
    

    let configuration = new m.Configuration()
    let confData = new m.PersistentData()
    expect(confData).toBeDefined() 
    let builderView = new m.BuilderView()
    expect(builderView.icon).toBeDefined() 
    expect(builderView.render).toBeDefined() 
    let icon =  builderView.icon()

    expect(icon.content.includes("mymodule-svg-icon")).toBeTruthy() 
    expect(icon.transforms).toBeDefined() 

    let moduleId= 'toto'
    let environment = {}
    let mdle = new m.Module( { moduleId, configuration, MyModule, environment })

    expect(mdle).toBeDefined()     
    let renderView = new m.RenderView(mdle)
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
    export class Module extends ModuleFlow {

        constructor(params){ super(params)}
    }
}

test('MyModule2', () => {

    expect(pack.modules.MyModule2).toBeDefined()  
    let m = pack.modules.MyModule2
    let moduleId= 'tutu'
    let environment = {}
    let configuration = new m.Configuration()
    let mdle = new m.Module( { moduleId, configuration, MyModule, environment })

    let renderView = new m.RenderView(mdle)

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
    export class Module extends ModuleFlow {

        constructor(params){ super(params)}
    }
}

test('MyModule3', () => {

    expect(pack.modules.MyModule3).toBeDefined()  
    let m = pack.modules.MyModule3
    let moduleId= 'titi'
    let environment = {}
    let configuration = new m.Configuration()
    let mdle = new m.Module( { moduleId, configuration, MyModule, environment })

    let builderView = new m.BuilderView()

    let rendered = builderView.render(mdle)
    expect(rendered.nodeName).toEqual("rect")
    expect(rendered.id).toEqual("titi")
    
})