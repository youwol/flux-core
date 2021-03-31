
import { ModuleFlow, Pipe,genericModulePlot, freeContract} from '../index'

console.log = () =>{}


export class Input {
}

export class Output {
}

export class Module extends ModuleFlow{

    readonly output$ : Pipe<Output>

    constructor(params){ 
        super(params)    
        
        this.addInput({
            id:"input", 
            description:"",
            contract: freeContract(),
            onTriggered: undefined
        })

        this.output$ = this.addOutput({id:"output"})

    }
}




test('modulePlot', () => {
    let moduleId= 'toto'
    let mdle = new Module( { moduleId, configuration: {title:"title"}, Factory: undefined, environment: undefined })

    let p = genericModulePlot({module:mdle,icon:"", width:100, vMargin:10, vStep:10}) 

    let plugs = p.querySelectorAll(".plug")
    expect(plugs.length).toEqual(2)

    plugs = p.querySelectorAll(".plug.input")
    expect(plugs.length).toEqual(1)

    plugs = p.querySelectorAll(".plug.output")
    expect(plugs.length).toEqual(1)


    let slots = p.querySelectorAll(".slot")
    expect(slots.length).toEqual(2)

    slots = p.querySelectorAll(".slot.input")
    expect(slots.length).toEqual(1)
    
    slots = p.querySelectorAll(".slot.output")
    expect(slots.length).toEqual(1)

    expect(p.querySelectorAll("rect.module.content").length).toEqual(1)
    expect(p.querySelectorAll(".module.header.title").length).toEqual(1)

})



export class Module2 extends ModuleFlow{

    readonly output0$ : Pipe<Output>
    readonly output1$ : Pipe<Output>

    constructor(params){ 
        super(params)    
        
        this.addInput({ id:"input0",  description:"", contract: freeContract(), onTriggered: undefined })
        this.addInput({ id:"input1",  description:"", contract: freeContract(), onTriggered: undefined })
        this.addInput({ id:"input2",  description:"", contract: freeContract(), onTriggered: undefined })

        this.output0$ = this.addOutput({id:"output0"})
        this.output1$ = this.addOutput({id:"output1"})
    }
}



test('modulePlot 2', () => {
    let moduleId= 'toto'
    let mdle = new Module2( { moduleId, configuration: {title:"title"}, Factory: undefined, environment: undefined })

    let p = genericModulePlot({module:mdle,icon:"", width:100, vMargin:10, vStep:10}) 

    let plugs = p.querySelectorAll(".plug")
    expect(plugs.length).toEqual(5)

    plugs = p.querySelectorAll(".plug.input")
    expect(plugs.length).toEqual(3)

    plugs = p.querySelectorAll(".plug.output")
    expect(plugs.length).toEqual(2)

})
