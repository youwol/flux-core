
export interface DescriptionBox{

    descriptionBoxId: string
    descriptionHtml: string
    modulesId: Array<string>
    title: string
    properties: {
        color: string
    }
}

export interface ModuleView{

    moduleId: string
    xWorld: number
    yWorld: number
}

export interface ConnectionView{

    connectionId: string
    wireless: boolean
}

export interface Module{

    moduleId: string
    factoryId:  {module:string, pack:string}
    configuration: { title: string, description: string, data: {[key:string]: any} }
}

export interface Plugin extends Module {

    parentModuleId: string
}

export interface Connection{

    start: { moduleId: string, slotId: string}
    end: { moduleId: string, slotId: string}
    adaptor?: { adaptorId: string, configuration: { title: string, description: string, data: {[key:string]: any} } }
}

export interface LayerTree{

    layerId: string,
    moduleIds: Array<string>,
    title: string,
    children: Array<LayerTree>
}

export interface Workflow{

    modules:Array<Module>,
    connections:Array<Connection>
    plugins:Array<Plugin>,
    rootLayerTree : LayerTree
}

export interface LoadingGraph{

    definition: Array<Array<[string,string]>>
    graphType: string
    lock: Array<{name:string, version: string, id: string}>
}

export interface Requirements{
    fluxComponents: Array<string>
    fluxPacks: Array<string>
    libraries: {[key:string]: string}
    loadingGraph: LoadingGraph
}

export interface BuilderRendering{
    descriptionsBoxes: Array<DescriptionBox>,
    modulesView:Array<ModuleView>,
    connectionsView:Array<ConnectionView>
}

export interface RunnerRendering{
    layout: string,
    style: string
}

export interface Project{

    name: string
    description: string
    runnerRendering: RunnerRendering,
    builderRendering: BuilderRendering,
    requirements: Requirements,
    workflow: Workflow
}
