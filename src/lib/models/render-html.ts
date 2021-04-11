import { ModuleFlux } from './models-base';
import { GroupModules } from '../modules/group.module';
import { Component } from '../modules/component.module';


/**
 * 
 * @param div the wrapper (parent) div of the target flux module  
 * @param mdle the target module
 */
function applyWrapperDivAttributes(div: HTMLDivElement, mdle:ModuleFlux){

    let attr =  mdle.Factory.RenderView.wrapperDivAttributes || (() => {})
  
    div.classList.add(`flux-element`)
    mdle instanceof Component.Module && div.classList.add(`flux-component`)
    attr(mdle) && attr(mdle).class && div.classList.add(attr(mdle).class)
    
    let styles = attr(mdle) && attr(mdle).style ?  attr(mdle).style: {}
    Object.entries(styles).forEach( ([k,v]:[string,string])=> div.style.setProperty(k,v))
}

/**
 * Render a templated layout containing reference to modules' views.
 * 
 * The templated layout, in addition to any regular HTML Element, can contains reference wrapper elements to some modules' view.
 * A reference element is a HTMLDivElement with **id** equal to associated module's id
 * 
 * @param templateLayout The template layout
 * @param modules the list of modules included in *templateLayout*, only the module defining a [[ModuleRendererRun]]
 * view will be considered
 * @returns the input div *templateLayout* with wrapper module's div containing the actual modules' view
 */
export function renderTemplate( templateLayout: HTMLDivElement, modules: Array<ModuleFlux> ){

    let modulesToRender =  modules
    .filter( m=> m.Factory.RenderView !== undefined )
    .map( c => [c, new c.Factory.RenderView(c)])

    modulesToRender
    .filter(([mdle]:[ModuleFlux]) => !(mdle instanceof GroupModules.Module) )
    .forEach( ([mdle,renderer]:[ModuleFlux,any]) => { 
        let wrapperDiv = templateLayout.querySelector("#"+mdle.moduleId) as HTMLDivElement
        if(wrapperDiv){
            applyWrapperDivAttributes(wrapperDiv, mdle)
            let divChild = renderer.render()
            wrapperDiv.appendChild(divChild) 
            if(mdle["renderedElementDisplayed$"])
                mdle["renderedElementDisplayed$"].next(divChild)
        }
    })
    modulesToRender
    .filter(([mdle]:[ModuleFlux,any]) => mdle instanceof GroupModules.Module )
    .forEach( ([mdle]:[ModuleFlux,any]) => { 
        let d = templateLayout.querySelector("#"+mdle.moduleId) as HTMLDivElement
        if(d && mdle["renderedElementDisplayed$"] )
            mdle["renderedElementDisplayed$"].next(d)
    })
    return templateLayout
}
