

import { ModuleTest} from './test-modules'
import { ModuleConfiguration,GroupModules, Workflow, LayerTree,ModuleView,Connection } from '../index'
import { SlotRef } from '../lib/models/models-base'
console.log = () =>{}

test('empty group module test', () => {

    let configuration = new ModuleConfiguration({
        title:'title', 
        description:'description', 
        data: new ModuleTest.PersistentData()
    })

    let layerId     = 'testLayerGroup'
    let groupLayer = new LayerTree('testLayerGroup','test layer',[],[]) 
    let rootLayer = new LayerTree('root','root layer',[groupLayer],[]) 
    let workflow  = new Workflow([],  [],  [], rootLayer)
    let mdle = new GroupModules.Module( { layerId,workflowGetter:(_)=>workflow, moduleId:'groupModule', configuration, Factory: GroupModules, environment:{} })
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
    let groupLayer = new LayerTree('testLayerGroup','test layer',[],["mdle2","mdle3"]) 
    let rootLayer = new LayerTree('root','root layer',[groupLayer],["mdle1","mdle4"]) 
    let workflow  = new Workflow(mdles,  [],  [], rootLayer)
    let mdleGroup = new GroupModules.Module( { layerId,workflowGetter:(_)=>workflow, moduleId:'groupModule', configuration, Factory: GroupModules, environment:{} })
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
    let groupLayer = new LayerTree('testLayerGroup','test layer',[],["mdle2","mdle3"]) 
    let rootLayer = new LayerTree('root','root layer',[groupLayer],["mdle1","mdle4"]) 
    let mdleGroup = new GroupModules.Module( { layerId,workflowGetter:(_)=>workflow, moduleId:'groupModule', configuration, Factory: GroupModules, environment:{} })
    

    workflow  = new Workflow([...mdles,mdleGroup],  connections,  [], rootLayer)
    console.log(mdleGroup)
    let slots = mdleGroup.getAllSlots()
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

