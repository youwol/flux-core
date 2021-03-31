

import * as rxjs from 'rxjs'
import { instantiateModules, parseGraph } from '../index'
import { DropDown , Console} from './test-modules'


test('instantiate module default', () => {

    let modules     = instantiateModules({"dropDown":DropDown}) 
    expect(modules.dropDown.Factory).toBeDefined()
    expect(modules.dropDown.moduleId).toEqual('dropDown')
    expect(modules.dropDown.inputSlots.length).toEqual(0)
    expect(modules.dropDown.outputSlots.length).toEqual(1)
    expect(modules.dropDown.configuration.data.items).toEqual(DropDown.defaultConfigItems)
})



test('instantiate module with conf', () => {

    let confItems = [{ text: "option 1", value: { n : 0 }} ]
    let modules     = instantiateModules({"dropDown":[ DropDown, { items:confItems } ] 
    }) 
    expect(modules.dropDown.configuration.data.items).toEqual(confItems)
    expect(modules.dropDown.configuration.data.selectedIndex).toEqual(0)
})


test('instantiate graph with one module', () => {

   
    let branches = ['|~dropDown~|']
    let modules     = instantiateModules({
        "dropDown":DropDown 
    }) 
    let observers   = {}
    let adaptors    = {}
    let graph       = parseGraph( { branches, modules, adaptors, observers } )
    
    expect(graph.workflow.modules.length).toEqual(1)
    expect(graph.workflow.connections.length).toEqual(0)
})

test('instantiate graph with one branche', () => {

   
    let branches = ['|~dropDown~|-----|~console~|']
    let modules     = instantiateModules({
        "dropDown":DropDown,
        "console": Console
    }) 
    let observers   = {}
    let adaptors    = {}
    let graph       = parseGraph( { branches, modules, adaptors, observers } )
    
    expect(graph.workflow.modules.length).toEqual(2)
    expect(graph.workflow.connections.length).toEqual(1)
    expect(graph.workflow.connections[0].start.moduleId).toEqual("dropDown")
    expect(graph.workflow.connections[0].end.moduleId).toEqual("console")
})

test('instantiate graph with one branche and adaptor', () => {

   
    let branches = ['|~dropDown~|-----=a|~console~|']
    let modules     = instantiateModules({
        "dropDown":DropDown,
        "console": Console
    }) 
    let observers   = {}
    let adaptors    = {
        a : ( ({data,context,config}) => ({data,context,config}))
    }
    let graph       = parseGraph( { branches, modules, adaptors, observers } )
    
    expect(graph.workflow.modules.length).toEqual(2)
    expect(graph.workflow.connections.length).toEqual(1)
    expect(graph.workflow.connections[0].start.moduleId).toEqual("dropDown")
    expect(graph.workflow.connections[0].end.moduleId).toEqual("console")
    expect(graph.workflow.connections[0].adaptor).toBeDefined()
})

test('instantiate graph with one branche, adaptor and observer', () => {

   
    let branches = ['|~dropDown~|--$obs$---=a|~console~|']
    let modules     = instantiateModules({
        "dropDown":DropDown,
        "console": Console
    }) 
    let observers   = {
        obs:        new rxjs.Subject()
    }
    let adaptors    = {
        a : ( ({data,context,config}) => ({data,context,config}))
    }
    let graph       = parseGraph( { branches, modules, adaptors, observers } )
    
    expect(graph.workflow.modules.length).toEqual(2)
    expect(graph.workflow.connections.length).toEqual(1)
    expect(graph.workflow.connections[0].start.moduleId).toEqual("dropDown")
    expect(graph.workflow.connections[0].end.moduleId).toEqual("console")
    expect(graph.workflow.connections[0].adaptor).toBeDefined()
    expect(graph.observers.length).toEqual(1)
    expect(graph.observers[0].from).toBeDefined()
    expect(graph.observers[0].to).toBeDefined()
})
