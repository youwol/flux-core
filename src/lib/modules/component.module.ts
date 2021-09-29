import {Flux,BuilderView, RenderView, Property, Schema} from '../models/decorators'
import { GroupModules } from './group.module';
import { packCore } from './factory-pack-core';
import { Schemas } from './schemas';
import { ReplaySubject } from 'rxjs';
import { renderTemplate } from '../models/render-html';



export namespace Component {

    export let id           =   "component"
    export let uid          =   "component@flux-pack-core"
    export let displayName  =   "Component"

    @Schema({
        pack: packCore,
        description: "Persistent Data of Component"
    })
    export class PersistentData extends Schemas.GroupModuleConfiguration{
               
        @Property({
            description: "The HTML definition",
            type:'code',
            editorConfiguration: {                
                mode: "xml",
                htmlMode: true
            }
        })
        html: string = ""

        @Property({
            description: "The CSS definition",
            type:'code',
            editorConfiguration: {
                mode: "css"
            }
        })
        css: string = ""


        constructor( {html, css, ...others } :{
            html?:string, 
            css?:string,
            classes?: string
        } ={} ) {
            super( Object.assign(others, {}) as any)

            if(html)
                this.html = html

            if(css)
                this.css = css

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
        render: (mdle: Module) => renderHtmlElement(mdle)
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

        getHTML({recursive}:{recursive:boolean}) : HTMLDivElement {

            let toHtml = (component: Module) => {
                let content = component.getPersistentData<PersistentData>().html
                var template = document.createElement('template');
                template.innerHTML = (content as any).trim();
                return template.content.firstChild as HTMLDivElement
            }
            let root = toHtml(this)
            if(!root || !recursive)
                return root

            let childrenComponents = this.getAllChildren()
                .filter( child => child instanceof Module) as Array<Module> 
            
            let divComponents = childrenComponents
            .reduce((acc,component) => ({...acc,...{[component.moduleId]:toHtml(component)}})
                    ,{})
    
            while(Object.entries(divComponents).length > 0 ){
                let previousLength = Object.entries(divComponents).length
                Array.from(root.querySelectorAll('.flux-component'))
                .filter( (item) => divComponents[item.id] != undefined)
                .forEach( (htmlDiv) =>{
                    htmlDiv.replaceWith(divComponents[htmlDiv.id])
                    delete divComponents[htmlDiv.id]
                })
                if(Object.entries(divComponents).length == previousLength)
                    break
            }
            return root
        }

        getCSS({recursive, asString}:{recursive:boolean, asString} = {recursive:false, asString:true}) : CSSStyleSheet | string {
            let css = () => {
                if(!recursive)
                return this.getPersistentData<PersistentData>().css

                return this.getAllChildren()
                .filter( child => child instanceof Module) 
                .map( child => child.getPersistentData<PersistentData>()) 
                .reduce( (acc: string, e: PersistentData) => acc+"\n"+e.css , this.getPersistentData<PersistentData>().css)
            }   
            let css_string = css()
            
            if(asString)
                return css_string

            let styleSheet = new CSSStyleSheet()
            css_string.split('}')
            .filter( rule => rule != "")
            .forEach( rule => styleSheet.insertRule(rule) )
            return styleSheet
        }
    }
    

    export function renderHtmlElement(mdle:Module){

        let div = mdle.getHTML({recursive: false})
        // The outer element of div is the 'wrapper div' itself => we do not want to include it as 
        // child of the wrapper div encountered when parsing
        return Array.from<HTMLElement>(renderTemplate(div, mdle.getAllChildren()).children as any)
    }
}
