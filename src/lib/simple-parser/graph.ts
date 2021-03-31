import { Branch } from './branch';
import {Connection, ModuleFlow, PluginFlow } from '../module-flow/models-base';
import {Workflow, LayerTree } from '../flux-project/core-models';

export class Graph{

    readonly branches : Array<Branch>

    workflow: Workflow
    observers = []
    constructor( branches: Array<Branch> , public readonly modules: Array<ModuleFlow>, 
        public readonly withConnections: Array<Connection> = [], layerTree:LayerTree){
        
        this.branches   = branches        
        let connections = branches.reduce( (acc,b) => acc.concat(this._createConnections(b)), []).concat(withConnections)
        let plugins     = modules.filter( m => m instanceof PluginFlow) as Array<PluginFlow<any>>
        this.workflow   = new Workflow([...modules,...plugins],connections,plugins, layerTree)
        this.observers  = branches.reduce( (acc,b) => acc.concat(b.observers), [])
    }

    _createConnections(branch: Branch): Array<Connection> {

        let connections = branch.starts.map( (_ , i) => {

            if( branch.starts[i].outputSlot == undefined ){
                let mess = `can not connect "${branch.starts[i].module.moduleId}" to "${branch.ends[i].module.moduleId}" (likely inconsistent nb of outputs of  "${branch.starts[i].module.moduleId}")`
                console.error(mess, {start:branch.starts[i], end:branch.ends[i]} )
                throw Error(mess)
            }

            if( branch.ends[i].inputSlot == undefined ){
                let mess = `can not connect "${branch.ends[i].module.moduleId}" from "${branch.starts[i].module.moduleId}" (likely inconsistent nb of inputs of "${branch.ends[i].module.moduleId}" )`
                console.error(mess, {start:branch.starts[i], end:branch.ends[i]} )
                throw Error(mess)
            }

            return new Connection( branch.starts[i].outputSlot, branch.ends[i].inputSlot, branch.ends[i].adaptor)
        })
        return connections;
    }

}

    
