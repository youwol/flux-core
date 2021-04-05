import { ModuleFlow } from './models-base';
import { GroupModules } from '../modules/group.module';
import { Component } from '../modules/component.module';

export function applyWrapperDivAttributes(div: HTMLDivElement, mdle:ModuleFlow){

    let attr =  mdle.Factory.RenderView.wrapperDivAttributes || (() => {})
  
    div.classList.add(`flux-element`)
    mdle instanceof Component.Module && div.classList.add(`flux-component`)
    attr(mdle) && attr(mdle).class && div.classList.add(attr(mdle).class)
    
    let styles = attr(mdle) && attr(mdle).style ?  attr(mdle).style: {}
    Object.entries(styles).forEach( ([k,v]:[string,string])=> div.setAttribute(k,v))
}


export function renderTemplate( templateLayout: HTMLDivElement, modules: Array<ModuleFlow> ){

    let modulesToRender =  modules
    .filter( m=> m.Factory.RenderView !== undefined )
    .map( c => [c, new c.Factory.RenderView(c)])

    modulesToRender
    .filter(([mdle,renderer]:[ModuleFlow,any]) => !(mdle instanceof GroupModules.Module) )
    .forEach( ([mdle,renderer]:[ModuleFlow,any]) => { 
        let wrapperDiv = templateLayout.querySelector("#"+mdle.moduleId) as HTMLDivElement
        if(wrapperDiv){
            applyWrapperDivAttributes(wrapperDiv, mdle)
            let divChild = renderer.render()
            /*divChild.id = mdle.moduleId
            divChild.classList.add("flux-element")*/
            wrapperDiv.appendChild(divChild) 
            if(mdle["renderedElementDisplayed$"])
                mdle["renderedElementDisplayed$"].next(divChild)
        }
    })
    modulesToRender
    .filter(([mdle,renderer]:[ModuleFlow,any]) => mdle instanceof GroupModules.Module )
    .forEach( ([mdle,renderer]:[ModuleFlow,any]) => { 
        let d = templateLayout.querySelector("#"+mdle.moduleId) as HTMLDivElement
        if(d && mdle["renderedElementDisplayed$"] )
            mdle["renderedElementDisplayed$"].next(d)
    })
    return templateLayout
}

