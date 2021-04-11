import { LayerTree, instantiateModules, parseGraph, Runner,Cache, 
    Connection, SlotRef, Component, renderTemplate, Graph } from '../index'
import { Context } from '../lib/models/context'
import { ModuleTest, Label } from './test-modules'

test("simple component with label display", (done) =>{
    
    let branches = [
                     '=== group component =====',
     '|~module0~|----|~module1~|---|~label~|---|~module3~|',
                     '========================='
    ]
    var graph : Graph = undefined
    let modules = instantiateModules({
        module0: ModuleTest,
        module1: ModuleTest,
        label: Label,
        module3: ModuleTest,
        component: [Component, {workflowGetter:(_)=>graph.workflow, layerId:"componentLayer", explicitInputsCount:1} ]
    })
    let withConnections = [
        new Connection(new SlotRef(`explicitInput0_in`,'component'),modules.module1.inputSlots[0])
    ]
    let layerTree = new LayerTree("root","root layer",[new LayerTree("componentLayer","component",[],["module1","label"])],["module0","module3"])
    graph = parseGraph( { branches, modules, withConnections, layerTree } )
    
    new Runner( graph ) 
    let div = document.createElement("div")
    div.innerHTML = "<div id='template'><div id='component'><label> result: </label><div id='label'></div></div></div>"
    
    renderTemplate(div,graph.workflow.modules)
    let context = new Context('module0 execution', {}, undefined)
    modules.module0.square( {data:{value:1},configuration:{},context}, { cache: new Cache()} )
    const promise1 = new Promise((resolve, reject) => {
        setTimeout(() => {
          resolve(div);
        }, 300);
    });
      
    promise1.then((div:HTMLDivElement) => {
        let templateDiv = div.querySelector("#template")
        expect(templateDiv.children.length).toEqual(1)
        let componentDiv = div.querySelector("#component")
        expect(componentDiv).toBeDefined()
        expect(componentDiv.innerHTML).toEqual("<label> result: </label><div id=\"label\" class=\"flux-element\"><div><label>1</label></div></div>")
        let label = componentDiv.querySelector("#label label")
        expect(label.innerHTML).toEqual("1")
        done()
    });
})