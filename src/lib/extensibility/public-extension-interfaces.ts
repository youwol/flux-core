
import * as rxjs from 'rxjs'
import { ModuleFlow } from '../module-flow/models-base'

export class ExtensionsObservables{

    projectUpdated$ = new rxjs.ReplaySubject(1)
}


export class BuilderViewAPI{

    static moduleHeaderActions : Object = {}

    static addHeaderAction( id: string, action : (ModuleFlow) => () => any){
        BuilderViewAPI.moduleHeaderActions[id] = action
    }

    static removeHeaderAction( id: string){ 
        delete BuilderViewAPI.moduleHeaderActions[id]
    }

    static getHeaderActions(mdle: ModuleFlow){
        return Object.entries(BuilderViewAPI.moduleHeaderActions)
        .map( ([id,getter]) => [id,getter(mdle)])
        .filter( ([id,action]) => action)
        .reduce( (acc,[id, action]) => Object.assign({},acc,{[id]:action}),{})
    }
}

export class FluxExtensionAPIs{

    static namespaces : Object = {}

    static registerAPI( namespace : string, staticClass ) {
        FluxExtensionAPIs.namespaces[namespace] = staticClass
    }

    static get(id: string){
        return this.namespaces[id]
    }

}

FluxExtensionAPIs.registerAPI('BuilderView', BuilderViewAPI)