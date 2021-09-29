

/**
 * @category schemas
 */
export interface DescriptionBoxSchema{

    descriptionBoxId: string
    descriptionHtml: string
    modulesId: Array<string>
    title: string
    properties: {
        color: string
    }
}

/**
 * @category schemas
 */
export interface ModuleViewSchema{

    moduleId: string
    xWorld: number
    yWorld: number
}

/**
 * @category schemas
 */
export interface ConnectionViewSchema{

    connectionId: string
    wireless: boolean
}

/**
 * @category schemas
 */
export interface ModuleSchema{

    moduleId: string
    factoryId:  {module:string, pack:string}
    configuration: { title: string, description: string, data: {[key:string]: any} }
}

/**
 * @category schemas
 */
export interface PluginSchema extends ModuleSchema {

    parentModuleId: string
}

/**
 * @category schemas
 */
export interface ConnectionSchema{

    start: { moduleId: string, slotId: string}
    end: { moduleId: string, slotId: string}
    adaptor?: { adaptorId: string, mappingFunction: string } 
}

/**
 * @category schemas
 */
export interface LayerTreeSchema{

    layerId: string,
    moduleIds: Array<string>,
    title: string,
    children: Array<LayerTreeSchema>,
    html: string,
    css: string
}

/**
 * @category schemas
 */
export interface WorkflowSchema{

    modules:Array<ModuleSchema>,
    connections:Array<ConnectionSchema>
    plugins:Array<PluginSchema>,
    rootLayerTree : LayerTreeSchema
}

/**
 * @category schemas
 */
export interface LoadingGraphSchema{

    definition: Array<Array<[string,string]>>
    graphType: string
    lock: Array<{name:string, version: string, id: string, type: string}>
}

/**
 * @category schemas
 */
export interface RequirementsSchema{
    fluxComponents: Array<string>
    fluxPacks: Array<string>
    libraries: {[key:string]: string}
    loadingGraph: LoadingGraphSchema
}

/**
 * @category schemas
 */
export interface BuilderRenderingSchema{
    descriptionsBoxes: Array<DescriptionBoxSchema>,
    modulesView:Array<ModuleViewSchema>,
    connectionsView:Array<ConnectionViewSchema>
}

/**
 * @category schemas
 */
export interface RunnerRenderingSchema{
    layout: string,
    style: string
}

/**
 * @category schemas
 */
export interface ProjectSchema{

    name: string
    schemaVersion: string
    description: string
    runnerRendering: RunnerRenderingSchema,
    builderRendering: BuilderRenderingSchema,
    requirements: RequirementsSchema,
    workflow: WorkflowSchema
}
