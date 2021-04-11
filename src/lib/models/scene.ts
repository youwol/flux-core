
export class Scene<Model>{

    constructor(
        public readonly idGetter: (Model) => string,         
        public readonly addFunction: (Model) => void,
        public readonly removeFunction: (Model) => void, 
        public readonly isReadyFunction: () => boolean,
        public readonly inScene = new Array<Model>(),
        public readonly inCache = new Array<Model>() ){
    }

    clearScene() : Scene<Model> {

        return new Scene(this.idGetter, this.addFunction,this.removeFunction, this.isReadyFunction, [], this.inCache  )
    }

    add( input: Model | Array<Model> ) : Scene<Model> {
        let inputs = Array.isArray(input) ? input : [input] 

        // inCache models in memory - the ones that are replaced removed and the ones coming from input added
        let inCache = this.inCache
        .filter(m => inputs.find((input: Model) => this.idGetter(m) === this.idGetter(input) ) == undefined )
        .concat(...inputs)

        let lastModelById = inCache.reduce((acc, e) => { acc[ this.idGetter(e) ] = e; return acc }, {})
        
        /* We need to remove from the scene the object with id that do not correspond to the last one */
        let modelsToRemove = this.inScene.filter((model) => lastModelById[ this.idGetter(model) ] != model)
        //let modelToKeep   = this.inScene.filter((model) => lastModelById[ this.idGetter(model) ] == model)

        let modelsRemoved = []
        
        modelsToRemove.forEach(model => { 
            if( !this.isReadyFunction())
                return 
            this.removeFunction(model) 
            modelsRemoved.push(model)
        })

        let modelsToAdd = Object.values(lastModelById).filter((object:Model) => !this.inScene.includes(object))
    

        let modelsAdded = []
        modelsToAdd.forEach( (object) => {
            if( !this.isReadyFunction())
                return 
            this.addFunction(object);            
            modelsAdded.push(object)
        })
        let inScene = this.inScene.filter( m => !modelsRemoved.includes(m) ).concat(modelsAdded)
        return new Scene(this.idGetter, this.addFunction,this.removeFunction, this.isReadyFunction ,inScene, inCache  )
    }
}
