
import {PluginFlow , SideEffects, ModuleFlow,Connection, SlotRef, InputSlot, Pipe,} from "../module-flow/models-base"
import { Workflow, LayerTree }from "../flux-project/core-models"
import { packCore } from './factory-pack-core';
import { SubscriptionStore } from '../module-flow/subscriptions-store';
import { Subject, combineLatest, ReplaySubject } from 'rxjs';
import { Property, Flux, BuilderView, RenderView } from '../module-flow/decorators';
import { Component } from './component.module';
import { GroupModules } from './group.module'
import { renderTemplate } from '../module-flow/render-html';
import { distinctUntilChanged } from 'rxjs/operators';


export namespace Customizer {
    
    //Icons made by <a href="https://www.flaticon.com/authors/freepik" title="Freepik">Freepik</a> from <a href="https://www.flaticon.com/" title="Flaticon"> www.flaticon.com</a>
     let svgIcon = `
     <g><path d="m76 223h360c41.458 0 76-33.535 76-75v-8c0-41.457-34.534-75-76-75h-245v-18c0-16.542-13.458-30-30-30h-82v-2c0-8.284-6.716-15-15-15s-15 6.716-15 15v18h-34c-8.284 0-15 6.716-15 15s6.716 15 15 15h34v34h-34c-8.284 0-15 6.716-15 15s6.716 15 15 15h34v17c0 8.284 6.716 15 15 15s15-6.716 15-15v-1h82c16.542 0 30-13.458 30-30v-18h245c24.935 0 46 20.607 46 45v8c0 24.393-21.065 45-46 45h-360c-41.459 0-76 33.535-76 75v56c0 41.459 34.535 75 76 75h21v68c0 24.813 20.187 45 45 45h325c24.813 0 45-20.187 45-45v-165c0-24.813-20.187-45-45-45h-340c-16.542 0-30 13.458-30 30v82h-21c-24.935 0-46-20.607-46-45v-56c0-24.393 21.065-45 46-45zm85-110h-82v-66h82zm-34 174h340c8.271 0 15 6.729 15 15v165c0 8.271-6.729 15-15 15h-325c-8.271 0-15-6.729-15-15-.02-183.807-.1-180 0-180z"/><path d="m384 447c34.738 0 63-28.262 63-63s-28.262-63-63-63-63 28.262-63 63 28.262 63 63 63zm0-96c18.196 0 33 14.804 33 33s-14.804 33-33 33-33-14.804-33-33 14.804-33 33-33z"/><path d="m224 447c34.738 0 63-28.262 63-63s-28.262-63-63-63-63 28.262-63 63 28.262 63 63 63zm0-96c18.196 0 33 14.804 33 33s-14.804 33-33 33-33-14.804-33-33 14.804-33 33-33z"/></g>
     `
    export class PersistentData  {

        @Property({ description: "definition", type:"code"})
        readonly code: string

        @Property({ description: "output count", type:"integer"})
        readonly outputCount: number

        constructor( { code, outputCount } :
                     { code?: string, outputCount?: number } =
                     {} ) {
            
            this.code = (code!=undefined) ? code : "return (div) => { return div }"
            this.outputCount = (outputCount!=undefined) ? outputCount : 0
        }        
    }

    @Flux({
        pack:           packCore,
        namespace:      Customizer,
        id:             "Customizer",
        displayName:    "Customizer",
        description:    "Customizer",
        compatibility: {
            ModuleView: {
                condition : (mdle) => true,
                description : "A Customizer plugin should be plug to a module with view"
            }
        }
    })
    @BuilderView({
        namespace:      Customizer,
        icon:           svgIcon 
    })
    export class Module extends PluginFlow<Component.Module>  implements SideEffects{

        customizeFunction:CallableFunction
        outs$ = new Array<Pipe<any>>()
        
        constructor(params){ 
            super(params)
            let config = this.getConfiguration<PersistentData>()

            this.customizeFunction =  new Function(config.code)()

            let nOuts = config.outputCount
            for(let i=0; i<nOuts; i++){
                this.outs$.push(this.addOutput({id:"out_"+i}))
            }
            this.parentModule["renderedElementDisplayed$"].subscribe( (div)=> {
                return this.customizeFunction(div, this.outs$)
            })
        }

        apply(){}

        dispose() {}

    }

}
