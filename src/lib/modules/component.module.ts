import {Flux,BuilderView, RenderView, Property, Schema} from '../module-flow/decorators'
import { GroupModules } from './group.module';
import { packCore } from './factory-pack-core';
import { Schemas } from './schemas';
import { ReplaySubject } from 'rxjs';
import { renderTemplate } from '../module-flow/render-html';



export namespace Component {

    export let id           =   "component"
    export let uid          =   "component@flux-pack-core"
    export let displayName  =   "Component"

    @Schema({
        pack: packCore,
        description: "Persistent Data of Component"
    })
    export class PersistentData extends Schemas.GroupModuleConfiguration{
               
        constructor( {...others } :{layout?:string} ={} ) {
            super( Object.assign(others, {}) as any)
        }
    }


    @Flux({
        pack:           packCore,
        namespace:      Component,
        id:             "Component",
        displayName:    "Component",
        description:    "Component"
    })
    @BuilderView({
        namespace:      Component,
        render :        (mdle, icon) => GroupModules.groupModulePlot( {  module:mdle, icon : icon, width : 150, vMargin:50, vStep:25 }),
        icon:           GroupModules.svgIcon
    })
    @RenderView({
        namespace: Component,
        render: (mdle) => renderHtmlElement(mdle)
    })
    export class Module extends GroupModules.Module {

        renderedElementDisplayed$ = new ReplaySubject<HTMLDivElement>()
        // This attribute is a temporary storage of layout and style when component are loaded from asset store.
        // It is used by grapes.js to load initial state of the component.
        // Definitely not ideal
        rendering: any 

        constructor(params) {
            super(params)
        }
    }
    

    export function renderHtmlElement(mdle:Module){
        let div = document.createElement('div')
        div.id=mdle.moduleId
        renderTemplate(div, mdle.getAllChildren())
        return div
    }
}
