/** @format */

//import { ComponentReplica } from '../lib/component-replica.plugin'

test('Need to be repluged', () => {})
/*
test("basic replication", (done) =>{
    
    let branches = [
                     '=== group component ===',
                    '|~module1~|---|~module2~|---|~module3~|',
                     '=======================',
    '|~module0~|----------|~replicator~|'
    ]
    var graph: Graph=undefined
    let modules = instantiateModules({
        module0: ModuleTest,
        module1: ModuleTest,
        module2: ModuleTest,
        module3: ModuleTest,
        component: [Component, {workflowGetter:(_)=> graph ? graph.workflow : emptyWf,layerId:"componentLayer", explicitInputsCount:1} ]
    })
    let plugins = instantiatePlugins({
        replicator: [ ComponentReplica, modules.component]
    })
    let withConnections = [
        new Connection(new SlotRef(`explicitInput0_in`,'component'),modules.module1.inputSlots[0])]
    let layerTree = new LayerTree("root","root layer",[new LayerTree("componentLayer","component",[],["module1","module2"])],["module0","replicator","module3"])
    
    graph = parseGraph( { branches, modules, plugins, withConnections, layerTree } )

    new Runner( graph ) 

    ModuleTest.Module.dataReceived$.pipe(
        take(4),
        map( ({moduleId}) => moduleId),
        reduce( (acc,e)=> [...acc,e], [])
    ).subscribe( d=> {
        expect(d).toEqual(["module0","module1_0","module2_0","module3"])
    })

    ModuleTest.Module.dataReceived$.pipe(
        skip(4),
        take(4),
        map( ({moduleId}) => moduleId),
        reduce( (acc,e)=> [...acc,e], [])
    ).subscribe( d=> {
        expect(d).toEqual(["module0","module1_1","module2_1","module3"])
    })

    ModuleTest.Module.dataReceived$.pipe(
        skip(8),
        take(4),
        map( ({moduleId}) => moduleId),
        reduce( (acc,e)=> [...acc,e], [])
    ).subscribe( d=> {
        expect(d).toEqual(["module0","module1_0","module2_0","module3"])
        done()
    })

    modules.module0.square({value:1},{},{}, new Cache())
    modules.module0.square({value:2},{},{}, new Cache())
    modules.module0.square({value:2},{},{id:"0"}, new Cache())
})

test("basic replication + constant rendering", (done) =>{
    
    let branches = [
                     '=== group component ===',
                    '|~module1~|---|~module2~|---|~module3~|',
                     '=======================',
    '|~module0~|----------|~replicator~|'
    ]

    var graph: Graph=undefined

    let modules = instantiateModules({
        module0: ModuleTest,
        module1: ModuleTest,
        module2: ModuleTest,
        module3: ModuleTest,
        component: [Component, {workflowGetter:(_)=> graph ? graph.workflow : undefined ,layerId:"componentLayer", explicitInputsCount:1} ]
    })
    let plugins = instantiatePlugins({
        replicator: [ ComponentReplica, modules.component]
    })
    let withConnections = [
        new Connection(new SlotRef(`explicitInput0_in`,'component'),modules.module1.inputSlots[0])]
    
    
    let layerTree = new LayerTree("root","root layer",[new LayerTree("componentLayer","component",[],["module1","module2"])],["module0","replicator","module3"])
    
    graph = parseGraph( { branches, modules, plugins, withConnections, layerTree } )

    new Runner( graph ) 
    let div = document.createElement("div")
    div.innerHTML = "<div id='template'><div id='component'><label> test </label></div></div>"
    
    renderTemplate(div,graph.workflow.modules)
    
    
    modules.module0.square({value:1},{},{}, new Cache())
    const afterRendering = new Promise((resolve, reject) => { setTimeout(() => resolve(div), 0);});
      
    afterRendering.then((div:HTMLDivElement) => {
        let templateDiv = div.querySelector("#template")
        expect(templateDiv.children.length).toEqual(2)
        let componentDiv = div.querySelector("#component")
        expect(componentDiv).toBeDefined()
        expect(componentDiv.innerHTML).toEqual("<label> test </label>")
        let componentDiv0 = div.querySelector("#component_0")
        expect(componentDiv0).toBeDefined()
        expect(componentDiv0.innerHTML).toEqual("<label> test </label>")
        done()
    });
})

test("basic replication + dynamic rendering", (done) =>{
    
    let branches = [
                     '=== group component ====',
                    '|~module1~|---|~label~|---|~module3~|',
                     '========================',
    '|~module0~|----------|~replicator~|'
    ]

    var graph: Graph=undefined

    let modules = instantiateModules({
        module0: ModuleTest,
        module1: ModuleTest,
        label: Label,
        module3: ModuleTest,
        component: [Component, {workflowGetter:(_)=>graph.workflow,layerId:"componentLayer", explicitInputsCount:1} ]
     })
    let plugins = instantiatePlugins({
        replicator: [ ComponentReplica, modules.component]
    })
    let withConnections = [
        new Connection(new SlotRef(`explicitInput0_in`,'component'),modules.module1.inputSlots[0])]
    
    let layerTree = new LayerTree("root","root layer",[new LayerTree("componentLayer","component",[],["module1","label"])],["module0","replicator","module3"])
    
    graph = parseGraph( { branches, modules, plugins, withConnections, layerTree } )

    new Runner( graph ) 
    let div = document.createElement("div")
    div.innerHTML = "<div id='template'><div id='component' class='flux-element'><label> result: </label><div id='label' class='flux-element'></div></div></div>"
    
    renderTemplate(div,graph.workflow.modules)
    
    modules.module0.square({value:1},{},{}, new Cache())
    modules.module0.square({value:2},{},{}, new Cache())

    const afterRendering = new Promise((resolve, reject) => { setTimeout(() => resolve(div), 0);});
      
    afterRendering.then((div:HTMLDivElement) => {
        let templateDiv = div.querySelector("#template")
        expect(templateDiv.children.length).toEqual(3)
        let componentDiv = div.querySelector("#component")
        let componentDiv0 = div.querySelector("#component_0")
        let componentDiv1 = div.querySelector("#component_1")
        expect(componentDiv).toBeDefined()
        expect(componentDiv.innerHTML).toEqual("<label> result: </label><div id=\"label\" class=\"flux-element\"><div class=\"promised-futur\"></div></div>")
        expect(componentDiv0).toBeDefined()
        expect(componentDiv0.innerHTML).toEqual("<label> result: </label><div id=\"label_0\" class=\"flux-element\"><label>1</label></div>")
        expect(componentDiv1).toBeDefined()
        expect(componentDiv1.innerHTML).toEqual("<label> result: </label><div id=\"label_1\" class=\"flux-element\"><label>16</label></div>")
        done()
    });
})
*/
