

import { ModuleTest} from './test-modules'
import { ModuleConfiguration,GroupModules, Workflow, LayerTree,ModuleView,Connection, MockEnvironment } from '../index'
import { Factory, SlotRef } from '../lib/models/models-base'
import { Subject } from 'rxjs'
import { take } from 'rxjs/operators'
console.log = () =>{}

let environment = new MockEnvironment()

test('empty group module test', () => {

    let configuration = new ModuleConfiguration({
        title:'title', 
        description:'description', 
        data: new ModuleTest.PersistentData()
    })

    let layerId     = 'testLayerGroup'
    
    let rootLayerTree = new LayerTree({
        layerId:'root',
        title:'root layer',
        children:[
            new LayerTree({
                layerId,
                title:'test layer',
                children:[],
                moduleIds:[],
                html:"",
                css:""
        })],
        moduleIds:[],
        html:"",
        css:""
    }) 
    
    let mdle = new GroupModules.Module( { moduleId:'groupModule', 
    configuration, Factory: GroupModules as any, environment:environment, workflow$: new Subject<Workflow>() })
    console.log(mdle)
    
    expect(mdle.inputSlots).toEqual([])     
    expect(mdle.outputSlots).toEqual([])   
})


test('group 2 modules, no connection', () => {

    let configuration = new ModuleConfiguration({
        title:'title', 
        description:'description', 
        data: new ModuleTest.PersistentData()
    })

    let mdles = [1,2,3,4].map( i => new ModuleTest.Module( { moduleId:"mdle"+i, configuration, Factory:ModuleTest , environment: {} }) )

    let layerId     = 'testLayerGroup'
    let rootLayerTree = new LayerTree({
        layerId:'root',
        title:'root layer',
        children:[
            new LayerTree({
                layerId,
                title:'test layer',
                children:[],
                moduleIds:["mdle2","mdle3"],
                html:"",
                css:""
        })],
        moduleIds:["mdle1","mdle4"],
        html:"",
        css:""
    }) 
    let workflow  = new Workflow({
        modules:mdles, 
        connections:[],  
        plugins:[]
    })
    
    let workflow$ = new Subject<Workflow>()

    let mdleGroup = new GroupModules.Module( { moduleId:'groupModule', 
    configuration, Factory: GroupModules as any, workflow$, environment })

    workflow$.next(workflow)
    
    console.log(mdleGroup)
   
    expect(mdleGroup.inputSlots).toEqual([])     
    expect(mdleGroup.outputSlots).toEqual([])   
})

test('group 2 modules, 1 connection in, 1 connection out', () => {

    let configuration = new ModuleConfiguration({
        title:'title', 
        description:'description', 
        data: new ModuleTest.PersistentData()
    })
    var workflow : Workflow = undefined
    let mdles = [1,2,3,4].map( i => new ModuleTest.Module( { moduleId:"mdle"+i, configuration, Factory:ModuleTest , environment: {} }) )

    let connections = [
        new Connection(new SlotRef("output","mdle1"), new SlotRef("input","mdle2")),
        new Connection(new SlotRef("output","mdle2"), new SlotRef("input","mdle3")),
        new Connection(new SlotRef("output","mdle3"), new SlotRef("input","mdle4")),
    ]
    let layerId     = 'testLayerGroup'
    let rootLayerTree = new LayerTree({
        layerId:'root',
        title:'root layer',
        children:[
            new LayerTree({
                layerId,
                title:'test layer',
                children:[],
                moduleIds:["mdle2","mdle3"],
                html:"",
                css:""
        })],
        moduleIds:["mdle1","mdle4"],
        html:"",
        css:""
    }) 

    let workflow$ = new Subject<Workflow>()


    let mdleGroup = new GroupModules.Module( { moduleId:'groupModule',
     configuration, Factory: GroupModules as any, environment, workflow$ })
    
    workflow = new Workflow({
        modules:[...mdles,mdleGroup], 
        connections,  
        plugins:[]
    })
    
    workflow$.next(workflow)

    console.log(mdleGroup)
    mdleGroup.getAllSlots$().pipe(
        take(1)
    ).subscribe( slots => {
        expect(slots.inputs.implicits.length).toEqual(1)      
        expect(slots.inputs.implicits[0].moduleId).toEqual("mdle2")    
        expect(slots.inputs.implicits[0].slotId).toEqual("input")      
        expect(slots.outputs.implicits.length).toEqual(1)   
        expect(slots.outputs.implicits[0].moduleId).toEqual("mdle3")    
        expect(slots.outputs.implicits[0].slotId).toEqual("output")     

        let renderer = new mdleGroup.Factory.BuilderView()
        let div = renderer.render(mdleGroup)
        let inputSlots = div.querySelectorAll(".input.slot")
        let outputSlots = div.querySelectorAll(".output.slot")
        expect(inputSlots.length).toEqual(1)      
        expect(outputSlots.length).toEqual(1)  
    })    

})

