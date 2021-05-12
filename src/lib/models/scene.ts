
/**
 * 
 * ## Scene
 * 
 * A scene is an helper for stateful modules: modules that accumulates 
 * objects to display them in some ways. It can be for instance 2D or 3D viewers.
 * 
 * Providing a list of objects to add into the scene, two cases can be encountered:
 * -    no object with same id already exists in the scene: the object is added
 * -    an object with same id exists in the scene: the previous object is removed and the new one added.
 * 
 * The class is mostly relying on 3 callbacks taking an object as argument:
 * -    an **idGetter**: returns the idea of an object
 * -    an **addFunction**: when an object actually needs to be added in the scene,
 * this callback is used to let the class's consumer add this object into the rendering logic.
 * -    an **removeFunction**: when an object actually needs to be removed from the scene,
 * this callback is used to let the class's consumer remove this object from the rendering logic.
 * 
 * Another callback, **isReadyFunction**, allows to define when the rendering logic is correctly 
 * initialized. Until this function returns **true**, the objects added in the scene are 
 * saved in a cache and no call to **addFunction** or **removeFunction** are triggered. 
 * When this function returns **true**, the added objects, and eventually those in cache, 
 * are added in the scene (and calls to  **addFunction** or **removeFunction** triggered).
 * 
 * The class is immutable: when doing [[add]] or [[clear]] a new version of the scene is returned.
 * 
 * To initialize an empty scene, the function [[createEmptyScene]] should be used.
 */
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

/**
 * Creation companion function of the class [[Scene]]
 * @param id id getter, when adding an object into the scene, if one with same **id** 
 * already exists, the existing one is first removed before the incoming one is added
 * @param add when an object actually needs to be added in the scene,
 * this callback is used to let the class's consumer add this object into the rendering logic.
 * @param remove  when an object actually needs to be removed from the scene,
 * this callback is used to let the class's consumer remove this object from the rendering logic.
 * @param ready callback that returns true when the 'renderer' is ready; until then objects added to the scene are cached
 * @returns 
 */
export function createEmptyScene<TModel>({
    id, add, remove, ready
}:{
    id:(TModel)=> string,
    add:(TModel)=> void,
    remove:(TModel)=> void,
    ready: ()=> boolean,
}) : Scene<TModel> {

    return new Scene<TModel>(id,add,remove,ready)
}