import {Package,ModuleView, DescriptionBoxProperties, DescriptionBox, BuilderRendering, RunnerRendering,
    PackageLink, Requirements, Description, LayerTree, Workflow, Project} from '../lib/flux-project/core-models'

console.log = () =>{}

test('models init', () => {

    let pack = new Package("id","description", [1],[2],[3])
    expect(pack.id).toEqual("id")
    expect(pack.description).toEqual("description")
    expect(pack.modules).toEqual([1])
    expect(pack.plugins).toEqual([2])
    expect(pack.requirements).toEqual([3])
    
    let moduleView = new ModuleView("id", 0,0,{})
    expect(moduleView.moduleId).toEqual("id")
    expect(moduleView.xWorld).toEqual(0)
    expect(moduleView.yWorld).toEqual(0)
    expect(moduleView.Factory).toEqual({})
    
    let dBoxProps = new DescriptionBoxProperties("red")
    expect(dBoxProps.color).toEqual("red")
    
    let dBox = new DescriptionBox("dboxid", "title", [], "", dBoxProps)
    expect(dBox.descriptionBoxId).toEqual("dboxid")
    expect(dBox.title).toEqual("title")
    expect(dBox.modulesId).toEqual([])
    expect(dBox.descriptionHtml).toEqual("")
    expect(dBox.properties).toEqual(dBoxProps)

    let builderRendering = new BuilderRendering([moduleView], [],[dBox])
    expect(builderRendering.modulesView).toEqual([moduleView])
    expect(builderRendering.descriptionsBoxes).toEqual([dBox])
    expect(builderRendering.connectionsView).toEqual([])

    let runnerRendering = new RunnerRendering("layout", "style")
    expect(runnerRendering.layout).toEqual("layout")
    expect(runnerRendering.style).toEqual("style")

    let packageLink = new PackageLink("pId", "0.0.1")
    expect(packageLink.id).toEqual("pId")
    expect(packageLink.version).toEqual("0.0.1")

    let fluxComponents = ["Component_ee324ab6-b840-45b8-92bc-fecec00eaddd"] 
    let fluxPacks= ["flux-pack-youwol","flux-pack-utility-std","flux-pack-widgets-std","flux-pack-flows-std"]
    let libraries = {"@youwol/flux-pack-youwol":"0.0.0-next","@youwol/flux-pack-utility-std":"1.0.5-next","@youwol/flux-pack-widgets-std":"1.0.5-next","@youwol/flux-pack-flows-std":"1.1.0-next","jquery":"3.2.1","bootstrap":"4.4.1","reflect-metadata":"0.1.13","lodash":"4.17.15","tslib":"1.10.0","rxjs":"6.5.5","@youwol/flux-lib-core":"1.2.0-next","popper.js":"1.12.9"}
    let loadingGraph = {"graphType":"sequential","definition":[["/api/cdn-backend/libraries/jquery/3.2.1/jquery-3.2.1.slim.min.js","/api/cdn-backend/libraries/reflect-metadata/0.1.13/reflect-metadata.min.js","/api/cdn-backend/libraries/lodash/4.17.15/lodash.min.js","/api/cdn-backend/libraries/tslib/1.10.0/tslib.min.js","/api/cdn-backend/libraries/rxjs/6.5.5/rxjs.umd.min.js","/api/cdn-backend/libraries/popper.js/1.12.9/popper.min.js"],["/api/cdn-backend/libraries/bootstrap/4.4.1/bootstrap.min.js","/api/cdn-backend/libraries/youwol/flux-lib-core/1.2.0-next/flux-lib-core.umd.js"],["/api/cdn-backend/libraries/youwol/flux-pack-youwol/0.0.0-next/flux-pack-youwol.umd.js","/api/cdn-backend/libraries/youwol/flux-pack-utility-std/1.0.5-next/flux-pack-utility-std.umd.js","/api/cdn-backend/libraries/youwol/flux-pack-widgets-std/1.0.5-next/flux-pack-widgets-std.umd.js","/api/cdn-backend/libraries/youwol/flux-pack-flows-std/1.1.0-next/flux-pack-flows-std.umd.js"]]}

    let reqs = new Requirements(fluxComponents,fluxPacks,libraries, loadingGraph)
    expect(reqs.fluxComponents).toEqual(fluxComponents)
    expect(reqs.fluxPacks).toEqual(fluxPacks)
    expect(reqs.libraries).toEqual(libraries)
    expect(reqs.loadingGraph).toEqual(loadingGraph)

    let d = new Description("name", "description")
    expect(d.name).toEqual("name")
    expect(d.description).toEqual("description")

    let layer = new LayerTree({layerId:"layerId", title:"title", children:[], moduleIds:["module0"], html:"", css:""})
    expect(layer.layerId).toEqual("layerId")
    expect(layer.title).toEqual("title")
    expect(layer.children).toEqual([])
    expect(layer.moduleIds).toEqual(["module0"])

    let wf = new Workflow({
        modules:[1] as any,
        connections:[2] as any, 
        plugins:[3]as any
    })
    expect(wf.modules).toEqual([1]as any)
    expect(wf.connections).toEqual([2]as any)
    expect(wf.plugins).toEqual([3]as any)

    let project = new Project({
        name:"name", 
        schemaVersion:"0.0", 
        description:"description", 
        requirements:reqs, 
        workflow: wf,
        builderRendering, 
        runnerRendering
    })
    expect(project.name).toEqual("name")
    expect(project.schemaVersion).toEqual("0.0")
    expect(project.description).toEqual("description")
    expect(project.requirements).toEqual(reqs)
    expect(project.workflow).toEqual(wf)
    expect(project.builderRendering).toEqual(builderRendering)
    expect(project.runnerRendering).toEqual(runnerRendering)    

})
