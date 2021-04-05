import { BuilderView, Flux, Schema } from "../module-flow/decorators"
import { FluxPack, ModuleFlow, Pipe } from "../module-flow/models-base";


export let testPack = new FluxPack({
    name:'flux-test',
    description: 'flux pack helpers to test',
    version: '0.0.0'
});


/**
 * A module that can emit custom data on demand from the code.
 */
export namespace ModuleDataEmittor{

    @Schema({
        pack: testPack
    })
    export class PersistentData {
        constructor() {}
    }

    @Flux({ 
        pack: testPack, 
        namespace: ModuleDataEmittor, 
        id: "DataEmittor", 
        displayName: "DataEmittor",
    })
    @BuilderView({ 
        namespace: ModuleDataEmittor, 
        icon: ""
    })
    export class Module extends ModuleFlow {
        
        output$ : Pipe<unknown>

        constructor( params ){
            super(params) 
            this.output$ = this.addOutput({id:"value"})
        }

        emit( data: any ) {   
            this.output$.next(data)
        }
    }
}