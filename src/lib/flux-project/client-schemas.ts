
export interface DescriptionBoxSchema{

    descriptionBoxId: string
    descriptionHtml: string
    modulesId: Array<string>
    title: string
    properties: {
        color: string
    }
}

export interface ModuleViewSchema{

    moduleId: string
    xWorld: number
    yWorld: number
}

export interface ConnectionViewSchema{

    connectionId: string
    wireless: boolean
}

export interface ModuleSchema{

    moduleId: string
    factoryId:  {module:string, pack:string}
    configuration: { title: string, description: string, data: {[key:string]: any} }
}

export interface PluginSchema extends ModuleSchema {

    parentModuleId: string
}

export interface ConnectionSchema{

    start: { moduleId: string, slotId: string}
    end: { moduleId: string, slotId: string}
    adaptor?: { adaptorId: string, configuration: { title: string, description: string, data: {[key:string]: any} } }
}

export interface LayerTreeSchema{

    layerId: string,
    moduleIds: Array<string>,
    title: string,
    children: Array<LayerTreeSchema>
}

export interface WorkflowSchema{

    modules:Array<ModuleSchema>,
    connections:Array<ConnectionSchema>
    plugins:Array<PluginSchema>,
    rootLayerTree : LayerTreeSchema
}

export interface LoadingGraphSchema{

    definition: Array<Array<[string,string]>>
    graphType: string
    lock: Array<{name:string, version: string, id: string}>
}

export interface RequirementsSchema{
    fluxComponents: Array<string>
    fluxPacks: Array<string>
    libraries: {[key:string]: string}
    loadingGraph: LoadingGraphSchema
}

export interface BuilderRenderingSchema{
    descriptionsBoxes: Array<DescriptionBoxSchema>,
    modulesView:Array<ModuleViewSchema>,
    connectionsView:Array<ConnectionViewSchema>
}

export interface RunnerRenderingSchema{
    layout: string,
    style: string
}

export interface ProjectSchema{

    name: string
    description: string
    runnerRendering: RunnerRenderingSchema,
    builderRendering: BuilderRenderingSchema,
    requirements: RequirementsSchema,
    workflow: WorkflowSchema
}
