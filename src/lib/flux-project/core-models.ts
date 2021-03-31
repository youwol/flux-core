import { ModuleFlow, PluginFlow, Connection } from '../module-flow/models-base';

export class Package{

    constructor(public readonly id: string,
         public readonly description: any,
          public readonly modules: any,
          public readonly plugins: any,
          public readonly requirements: any ){
    }
}


export class PackageId{

    constructor( public readonly id: any ){
    }
}

export class ModuleView{

    constructor(public readonly moduleId : string, 
        public readonly xWorld: number, 
        public readonly yWorld: number,
        public readonly Factory: any ){}
}

export class DescriptionBoxProperties{

    constructor(public readonly color){

    }
}

export class DescriptionBox{

    constructor( public readonly descriptionBoxId: string,
                 public readonly title: string,
                 public readonly modulesId: Array<string> ,
                 public readonly descriptionHtml : string,
                 public readonly properties: DescriptionBoxProperties ){}
}

export class BuilderRendering{

    constructor( public readonly modulesView: Array<ModuleView> ,
                 public readonly connectionsView: Array<any>,
                 public readonly descriptionsBoxes: Array<DescriptionBox> ){
    }
}

export class RunnerRendering{

    constructor( public readonly layout : string = "", public readonly style : string = "" ){}
}

export class PackageLink{
    constructor( public readonly id: string, public readonly version : string ){}
}

export class Requirements{

    constructor( public readonly fluxComponents: Array<string>,public readonly fluxPacks: Array<string>,
        public readonly libraries: Object,public readonly loadingGraph: any){}
}

export class Description{

    constructor( public readonly name: string,public readonly description: string ){}
}


export class LayerTree {

    constructor( 
        public readonly layerId : string,  
        public readonly title : string,  
        public readonly children: Array<LayerTree>,                 
        public readonly moduleIds : Array<string>,
        ){}
    
    getLayerRecursive(testFct: (LayerTree)=>boolean) : LayerTree {

        if(testFct(this))
            return this

        return this.children.map( c => c.getLayerRecursive(testFct)).filter(d=>d)[0]
    }

    getChildrenModules() {
        return this.moduleIds.concat(...this.children.map( l => l.getChildrenModules())) 
    }

    getChildrenLayers() {
        return this.children.concat(...this.children.map( l => l.getChildrenLayers())) 
    }
  
}

export class Workflow {

    constructor( public readonly modules : Array<ModuleFlow>,  
                 public readonly connections : Array<Connection> ,                 
                 public readonly plugins : Array<PluginFlow<any>>,
                 public readonly rootLayerTree :LayerTree
                 ){}
} 

export class Project{

    constructor( public readonly name: string,
                 public readonly description: string,
                 public readonly requirements: Requirements, 
                 public readonly workflow: Workflow,
                 public readonly builderRendering: BuilderRendering,
                 public readonly runnerRendering: RunnerRendering ){
    }
}

