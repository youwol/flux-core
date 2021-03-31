import { from, Observable, of, Subscription } from "rxjs"
import { map, mapTo, mergeMap, reduce, tap } from "rxjs/operators"
import { BuilderRendering, DescriptionBox, ModuleView, Project, LayerTree, Workflow } from "./core-models"
import { packCore } from "../modules/factory-pack-core"
import { Adaptor, AdaptorConfiguration, Connection, Factory, FluxPack, ModuleFlow, PluginFlow } from "../module-flow/models-base"
import * as schemas from './client-schemas'
import { IEnvironment } from "../environment"



function getPackage(name:string){

    if(window[name])
      return window[name]

    console.warn(`The dependency ${name} has not been found, requirements needs update to include namespace in flux-packs.`)

    if(window[`@youwol/${name}`])
      return window[`@youwol/${name}`]

    throw Error(`Can not find loaded package ${name}`)
}


export function loadProjectDependencies$(
    project: schemas.Project,
    environment: IEnvironment
    ): Observable<{project:schemas.Project, packages: Array<FluxPack>}> {

    return of(project.requirements.loadingGraph)
    .pipe(
        mergeMap((root: any) => {
            return environment.fetchLoadingGraph(project.requirements.loadingGraph)
        }),
        tap(r => console.log("dependencies loaded", { libraries: r })),
        mergeMap(() => {
            return from(project.requirements.fluxPacks.map(p => getPackage(p)))
        }),
        mergeMap((jsModule: any) => {
            let installFct = jsModule.install || jsModule.pack.install
            if(!installFct)
                return of(jsModule)
            let install = installFct( environment )
            if( install instanceof Observable)
                return install.pipe(mapTo(jsModule))

            if( install instanceof Promise)
                return from(install).pipe(mapTo(jsModule))
            
            return of(jsModule)
        }),
        reduce((acc, e) => acc.concat(e), []),
        map(packages => {
            return { project, packages: [{ pack: packCore }, ...packages]} 
        })
    )
}


export function loadProject$(
    project$: Observable<schemas.Project>, 
    workflowGetter : ()=>Workflow, 
    subscriptionsStore: Map<Connection, any>, 
    environment: IEnvironment, 
    logger ): Observable<{project:Project, packages: Array<FluxPack>, modulesFactory: Map<string, Factory>}> {

    let projectData$ = project$.pipe(
        mergeMap( (project: schemas.Project) => {
            return loadProjectDependencies$(project, environment) 
        }),
        map(({ project, packages }) => {
            return createProject(project, packages, workflowGetter, subscriptionsStore, environment, logger)
        })
    )
    return projectData$
}


export function loadProjectDatabase$(
    projectId: string, 
    workflowGetter : ()=>Workflow, 
    subscriptionsStore: Map<Connection,Subscription>, 
    environment: IEnvironment, 
    logger ): Observable<{project:Project, packages: Array<FluxPack>, modulesFactory: Map<string, Factory>}>{

    return loadProject$(environment.getProject(projectId), workflowGetter, subscriptionsStore, environment, logger)
}


export function loadProjectURI$(
    projectURI: string, 
    workflowGetter : ()=>Workflow, 
    subscriptionsStore:  Map<Connection,Subscription>, 
    environment: IEnvironment, 
    logger ): Observable<{project:Project, packages: Array<FluxPack>, modulesFactory: Map<string, Factory>}> {

    let project = JSON.parse(decodeURIComponent(projectURI)) as schemas.Project
    return loadProject$( of(project), workflowGetter, subscriptionsStore, environment, logger)
}


export function createProject( 
    project: schemas.Project , 
    packs,
    workflowGetter : ()=>Workflow, 
    subscriptionsStore: Map<Connection,Subscription>, 
    environment: IEnvironment, 
    logger
    ): {project:Project, packages: Array<FluxPack>, modulesFactory: Map<string, Factory>}{

    let packages = packs.map( p => p.pack)
    
    packages.filter( p => p.initialize).forEach( p => p.initialize(environment))

    let modulesFactory = packages
    .reduce( (acc,e) => 
        acc
        .concat( 
            Object.values(e.modules ? e.modules : {})
            .map( (Factory:any)=> {
            
                let factoryKey = JSON.stringify({module:Factory["id"], pack: e.name})
                return [ factoryKey, Factory] }
            )
        ), 
        []
    )

    modulesFactory = new Map(modulesFactory)
    let rootLayerTree = instantiateProjectLayerTree(project.workflow.rootLayerTree ) 
    let modules = instantiateProjectModules(project.workflow.modules, modulesFactory, environment, workflowGetter, logger ) 
    let plugins = instantiateProjectPlugins(project.workflow.plugins, modules, modulesFactory, logger) 
    let connections = instantiateProjectConnections(subscriptionsStore,project.workflow.connections, [...modules, ...plugins])
        
    let newProject = new Project( 
        project.name,
        project.description,
        project.requirements,
        new Workflow( modules,connections,plugins,rootLayerTree ),
        instantiateProjectBuilderRendering(modules, project.builderRendering),
        project.runnerRendering
    )
    return { project: newProject, packages, modulesFactory }
}


export function instantiateProjectLayerTree(data: schemas.LayerTree) : LayerTree{

    return new LayerTree(data.layerId,data.title,data.children.map( c => instantiateProjectLayerTree(c)),
    data.moduleIds)
}


function isGroupingModule(moduleData: schemas.Module): boolean{
    return ["GroupModules", "Component"].includes(moduleData.factoryId.module)
}


export function instantiateProjectModules( 
    modulesData: Array< schemas.Module>, 
    modulesFactory: Map<string, Factory>, 
    environment: IEnvironment, 
    workflowGetter: () => Workflow, 
    logger 
    ): Array<ModuleFlow>{

   let modules = modulesData
   .map( moduleData => {
       let factoryKey = JSON.stringify(moduleData.factoryId)
       let Factory = modulesFactory.get(factoryKey)
       if(!Factory)
           throw Error(`Can not get factory ${factoryKey}`)
       let conf    = new Factory.Configuration({title:         moduleData.configuration.title,
                                                description:   moduleData.configuration.description,
                                                data:          new Factory.PersistentData(moduleData.configuration.data)
                                               })
       let groupData = isGroupingModule(moduleData) 
            ? {  workflowGetter,  layerId:moduleData.moduleId.split(Factory.id+"_")[1]  }
            : {}
       let data = Object.assign({},
        {
           moduleId:          moduleData.moduleId, 
           configuration:     conf, 
           Factory:           Factory,
           workflowGetter:    workflowGetter, // only relevant for Groups
           logger,
           environment:       environment
        }, groupData
        )
       
       let mdle  = new Factory.Module(data)                         
       return mdle 
   } ).filter(m => m)
   
   return modules
}

export function instantiateProjectPlugins(
    pluginsData: Array<schemas.Plugin>, 
    modules: Array<ModuleFlow>, 
    pluginsFactory:Map<string, Factory>, 
    logger
    ): Array<PluginFlow<unknown>>{
    
    let plugins = pluginsData.map( pluginData => {

        let factoryKey = JSON.stringify(pluginData.factoryId)
        let Factory = pluginsFactory.get(factoryKey)
        if(!Factory)
            throw Error(`Can not get factory ${factoryKey}`)
            
        if( Factory==undefined){
            console.error("Can not find factory ", pluginData)
        }
        let conf    = new Factory.Configuration({title:         pluginData.configuration.title,
                                                 description:   pluginData.configuration.description,
                                                 data:          new Factory.PersistentData(pluginData.configuration.data)})
        
        let parentModule = modules.find( m => m.moduleId ===pluginData.parentModuleId )
        let mdle  = new Factory.Module(
            {parentModule:parentModule,
             moduleId:          pluginData.moduleId, 
             configuration:     conf, 
             Factory:           Factory,
             logger:            logger} ) 
                        
        return mdle
    } )
    
    return plugins
}

export function instantiateProjectConnections( 
    allSubscriptions: Map<Connection,Subscription>,
    connectionsData : Array<schemas.Connection>, 
    modules: Array<ModuleFlow>
    ) : Array<Connection> {

    Array.from(allSubscriptions.values()).forEach( (value:any)=> value.unsubscribe() );

    allSubscriptions.clear()
    
    let connections = connectionsData.map( connection => {
        let moduleIn  = modules.filter( m => m.moduleId === connection.end.moduleId)[0]
        let moduleOut = modules.filter( m => m.moduleId === connection.start.moduleId)[0]
        if(!moduleIn){
            console.error("can not find module with id "+  connection.end.moduleId )
            return undefined
        } 
        if(!moduleOut){
            console.error("can not find module with id "+  connection.start.moduleId )
            return undefined
        }
        let slotOutput = moduleOut.outputSlots.find( c => c.slotId === connection.start.slotId)
        let slotInput = moduleIn.inputSlots.find( c => c.slotId === connection.end.slotId)
        if(!slotOutput ){
            console.error("can not find output slot " +  connection.start.slotId )
            return undefined
        }
        if(!slotInput ){
            console.error("can not find input slot " +  connection.end.slotId )
            return undefined
        }
        if(!connection.adaptor)
            return new Connection(slotOutput, slotInput)
        
        let adaptorConf = connection.adaptor.configuration as AdaptorConfiguration
        let adaptor = new Adaptor(connection.adaptor.adaptorId, adaptorConf)
        return new Connection(slotOutput,slotInput, adaptor)
    })
    .filter( c => c)
    
    return connections
}

export function instantiateProjectBuilderRendering( 
    modulesData: Array<ModuleFlow>, 
    rendererData: schemas.BuilderRendering 
    ) : BuilderRendering{
    
    let modulesViewData = rendererData.modulesView
    let connectionsViewData = rendererData.connectionsView || []
   

    let modulesView = modulesViewData.map( (moduleView:ModuleView) => { 
        let moduleData = modulesData.find( m=> moduleView.moduleId == m.moduleId)
        return new ModuleView( moduleView.moduleId, moduleView.xWorld, moduleView.yWorld, moduleData.Factory ) 
    })
    
    let connectionsView = connectionsViewData.map( (c:any) => c )

    let descriptionBoxes = rendererData.descriptionsBoxes.map(
        b => new DescriptionBox(b.descriptionBoxId,
                                b.title, b.modulesId, b.descriptionHtml, b.properties )
    ) 
    return new BuilderRendering( modulesView, connectionsView, descriptionBoxes )
}
