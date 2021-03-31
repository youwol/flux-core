import { ModuleFlow } from './models-base';
import { GroupModules } from '../modules/group.module';


export function renderTemplate( templateLayout: HTMLDivElement, modules: Array<ModuleFlow> ){

    let modulesToRender =  modules
    .filter( m=> m.Factory.RenderView !== undefined )
    .map( c => [c, new c.Factory.RenderView(c)])

    modulesToRender
    .filter(([mdle,renderer]:[ModuleFlow,any]) => !(mdle instanceof GroupModules.Module) )
    .forEach( ([mdle,renderer]:[ModuleFlow,any]) => { 
        let d = templateLayout.querySelector("#"+mdle.moduleId) as HTMLDivElement
        if(d){
            let divChild = renderer.render()
            /*divChild.id = mdle.moduleId
            divChild.classList.add("flux-element")*/
            d.appendChild(divChild) 
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

