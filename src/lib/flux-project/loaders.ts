import { from, of } from "rxjs"
import { map, mapTo, mergeMap, reduce, tap } from "rxjs/operators"
import { BuilderRendering, DescriptionBox, ModuleView, Project, LayerTree, Workflow } from "./core-models"
import { packCore } from "../modules/factory-pack-core"
import { Adaptor, AdaptorConfiguration, Connection, ModuleFlow } from "../module-flow/models-base"


function getPackage(name:string){

    if(window[name])
      return window[name]
    
    if( name.includes('/') ){
      let [prefix, suffix] = name.split('/')
      if(window[prefix][suffix])
        return window[prefix][suffix]
    }
    if(window[`@youwol/${name}`])
      return window[`@youwol/${name}`]

    if(window["@youwol"][name])
      return window["@youwol"][name]

    throw Error(`Can not find loaded package ${name}`)
}

function backwardCompatibilityPatches(project: any){

  let patch = (mdle) => {
    if( typeof(mdle.factoryId)=="string")
      mdle.factoryId = {
        module: mdle.factoryId.split('@')[0], 
        pack:"@youwol/"+mdle.factoryId.split('@')[1]
      }
  }
  project.workflow.modules.forEach( mdle => {
    patch(mdle)
  })
  project.workflow.plugins.forEach( mdle => {
    patch(mdle)
  })
  return project
}


export function loadProjectDependencies$(backend, projectId: string){

    return backend.getProject(projectId).pipe(
        map( (project) => {
            return backwardCompatibilityPatches(project)
        }),
        mergeMap( (project: any) => {
            return of( project.requirements.loadingGraph )
            .pipe(
                mergeMap( (root:any) => fetchJs$(backend, project.requirements.loadingGraph,0) ),
                tap( r => console.log("dependencies loaded" , {libraries: r})),
                mergeMap( () => {
                    return from(project.requirements.fluxPacks.map( p => getPackage(p) ))
                }),
                mergeMap( (pack:any) =>{
                    return pack.install ? pack.install().pipe( mapTo( pack) ) : of(pack) 
                }),
                reduce( (acc,e) => acc.concat(e), []),
                map( packages => {
                    return {project, packages:[{pack:packCore},...packages]} 
                })
            )
        })
    )
}

export function loadProject(backend, projectId: string, workflowGetter : ()=>Workflow, subscriptionsStore, environment, logger ) {

    return loadProjectDependencies$(backend, projectId).pipe(
        map( ({project, packages}) => {
            return createProject( project, packages, workflowGetter, subscriptionsStore, environment, logger ) 
        })
    )
}


export function createProject( project , packs, workflowGetter : ()=>Workflow , subscriptionsStore, environment, logger){

    let packages = packs.map( p => p.pack)
    
    packages.filter( p => p.initialize).forEach( p => p.initialize(environment))

    let modulesFactory = packages.reduce( (acc,e) => acc.concat( Object.values(e.modules).map( (Factory:any)=> {
        
        let factoryKey = JSON.stringify({module:Factory["id"], pack: e.schemaVersion ? e.id: `@youwol/${e.id}`})
        return [ factoryKey, Factory] }
    )) , [])

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


export function fetchJs$(backend, loadingGraph,i) {

    let currentLayer$ =  from( loadingGraph.definition[i] )
    .pipe(  mergeMap( url => {
        if(loadingGraph.graphType=="sequential")
            return backend.loadScript(url, true,window) 
        if(loadingGraph.graphType=="sequential-v1")
            return backend.loadAssetPackage(url[0], url[1], true,window) 
        throw Error(`LoadingGraph type not known (${loadingGraph.graphType})`)
    }), 
    reduce( (urls,url)  => urls.concat( url) , []) )

    return  i < loadingGraph.definition.length - 1 ?
        currentLayer$.pipe( mergeMap( urls0 => fetchJs$(backend, loadingGraph, i +1)
                                                .pipe( map( urls => urls0.concat(urls))))) :
        currentLayer$
}   

export function instantiateProjectLayerTree(data):LayerTree{

    return new LayerTree(data.layerId,data.title,data.children.map( c => instantiateProjectLayerTree(c)),
    data.moduleIds)
}

function isGroupingModule(moduleData){
    return ["GroupModules", "Component"].includes(moduleData.factoryId.module)
}

export function instantiateProjectModules( modulesData, modulesFactory, environment, workflowGetter, logger ): Array<ModuleFlow>{

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

export function instantiateProjectPlugins( pluginsData, modules, pluginsFactory, logger){
    
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

export function instantiateProjectConnections( allSubscriptions:Map<Connection,any>,connectionsData : Array<any>, modules ){

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

export function instantiateProjectBuilderRendering( modulesData: Array<ModuleFlow>, rendererData ) : BuilderRendering{
    
     
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
