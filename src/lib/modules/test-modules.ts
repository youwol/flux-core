import { BuilderView, Flux, Schema } from "../models/decorators"
import { FluxPack, ModuleFlux, Pipe } from "../models/models-base";


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
    export class Module extends ModuleFlux {
        
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