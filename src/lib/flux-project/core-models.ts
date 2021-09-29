
import { access } from 'node:fs';
import { ModuleFlux, PluginFlux, Connection } from '../models/models-base';

/**
 * @category models
 */
export class Package{

    constructor(public readonly id: string,
         public readonly description: any,
          public readonly modules: any,
          public readonly plugins: any,
          public readonly requirements: any ){
    }
}

/**
 * @category models
 */
export class PackageId{

    constructor( public readonly id: any ){
    }
}

/**
 * @category models
 */
export class ModuleView{

    constructor(public readonly moduleId : string, 
        public readonly xWorld: number, 
        public readonly yWorld: number,
        public readonly Factory: any ){}
}

/**
 * @category models
 */
export class DescriptionBoxProperties{

    constructor(public readonly color){

    }
}

/**
 * @category models
 */
export class DescriptionBox{

    constructor( public readonly descriptionBoxId: string,
                 public readonly title: string,
                 public readonly modulesId: Array<string> ,
                 public readonly descriptionHtml : string,
                 public readonly properties: DescriptionBoxProperties ){}
}

/**
 * @category models
 */
export class BuilderRendering{

    constructor( public readonly modulesView: Array<ModuleView> ,
                 public readonly connectionsView: Array<any>,
                 public readonly descriptionsBoxes: Array<DescriptionBox> ){
    }
}

/**
 * @category models
 */
export class RunnerRendering{

    constructor( public readonly layout : string = "", public readonly style : string = "" ){}
}

/**
 * @category models
 */
export class PackageLink{
    constructor( public readonly id: string, public readonly version : string ){}
}

/**
 * @category models
 */
export class Requirements{

    constructor( public readonly fluxComponents: Array<string>,public readonly fluxPacks: Array<string>,
        public readonly libraries: Object,public readonly loadingGraph: any){}
}

/**
 * @category models
 */
export class Description{

    constructor( public readonly name: string,public readonly description: string ){}
}

/**
 * @category models
 */
export class LayerTree {

    public readonly layerId : string
    public readonly title : string 
    public readonly children: Array<LayerTree>                
    public readonly moduleIds : Array<string>
    public readonly html : string = ""
    public readonly css : string = ""

    constructor( {layerId, title, children, moduleIds, html, css}:
        {
            layerId : string,  
            title : string,  
            children: Array<LayerTree>, 
            moduleIds : Array<string>,
            html : string,
            css : string
        }){
            this.layerId = layerId
            this.title = title
            this.children = children
            this.moduleIds = moduleIds
            this.html = html
            this.css
        }
    
    getLayerRecursive(testFct: (LayerTree)=>boolean) : LayerTree {

        if(testFct(this))
            return this

        return this.children.map( c => c.getLayerRecursive(testFct)).filter(d=>d)[0]
    }

    getLayersRecursive(testFct: (LayerTree)=>boolean) : LayerTree[] {

        let children = this.children.map( c => c.getLayersRecursive(testFct)).flat()
        return testFct(this) ? new Array<LayerTree>(this).concat(children) : children
    }

    getChildrenModules() {
        return this.moduleIds.concat(...this.children.map( l => l.getChildrenModules())) 
    }

    getChildrenLayers() {
        return this.children.concat(...this.children.map( l => l.getChildrenLayers())) 
    }
  
    getHTML( {recursive}:{recursive:boolean} = {recursive:false}) {

        let toHtml = (content: string) => {
            var template = document.createElement('template');
            template.innerHTML = (content as any).trim();
            return template.content.firstChild as HTMLDivElement
        }
        if(!recursive)
            return toHtml(this.html)
        
        let layersComponents = this.getLayersRecursive( layer => layer.html != "" && layer.layerId != this.layerId)
        .reduce((acc,e) => ({...acc,...{["Component_"+e.layerId]:toHtml(e.html as any)}})
                ,{})
        let root = toHtml(this.html as any)
        if(!root)
            return root
        while(Object.entries(layersComponents).length > 0 ){
            let previousLength = Object.entries(layersComponents).length
            Array.from(root.querySelectorAll('.flux-component'))
            .filter( (item) => layersComponents[item.id] != undefined)
            .forEach( (htmlDiv) =>{
                htmlDiv.replaceWith(layersComponents[htmlDiv.id])
                delete layersComponents[htmlDiv.id]
            })
            if(Object.entries(layersComponents).length == previousLength)
                break
        }
        return root
    }


    getCSS({recursive}:{recursive:boolean} = {recursive:false}) : string {
        if(!recursive)
            return this.css
        return this.getLayersRecursive(()=>true).reduce( (acc,e) => acc+"\n"+e.css , "")
    }
}

/**
 * @category models
 */
export class Workflow {

    public readonly modules : Array<ModuleFlux>
    public readonly connections : Array<Connection>                  
    public readonly plugins : Array<PluginFlux<any>>

    constructor( {modules, connections, plugins}: {
        modules : Array<ModuleFlux>,  
        connections : Array<Connection>,
        plugins : Array<PluginFlux<any>>,
    }){
        this.modules = modules
        this.connections = connections
        this.plugins = plugins
    }
} 

/**
 * @category models
 */
export class Project{

    public readonly name: string
    public readonly schemaVersion: string
    public readonly description: string
    public readonly requirements: Requirements 
    public readonly workflow: Workflow
    public readonly builderRendering: BuilderRendering
    public readonly runnerRendering: RunnerRendering

    constructor( {name, schemaVersion,description, requirements, workflow, builderRendering, runnerRendering} : { 
        name: string,
        schemaVersion: string,
        description: string,
        requirements: Requirements,
        workflow: Workflow,
        builderRendering: BuilderRendering, 
        runnerRendering: RunnerRendering
    }){
        this.name = name
        this.schemaVersion = schemaVersion
        this.description = description
        this.requirements = requirements
        this.workflow = workflow
        this.builderRendering = builderRendering
        this.runnerRendering = runnerRendering
    }
}

