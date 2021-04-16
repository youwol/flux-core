import { ModuleFlux } from './models-base'
import { createHTMLElement } from '../modules/reactive-html'
import { FluxExtensionAPIs } from '../extensibility/public-extension-interfaces'

export function getTransforms(g) {
    if (g.style.transform)
        return
    let parentBRect = g.parentElement.getBoundingClientRect()
    let bRect = g.getBoundingClientRect()
    let ty = parentBRect.top - bRect.top
    let tx = parentBRect.left - bRect.left
    let scale = Math.min(parentBRect.width / bRect.width, parentBRect.height / bRect.height)
    return `translate(${-parentBRect.width / 4}px,${-parentBRect.height / 4}px) scale(${0.5 * scale}) translate(${tx}px,${ty}px)`
}


export function toCssName( name: string ) {
    return  name.toLowerCase().replace(/ /g,'-').replace(/\./g,'-').replace(/~/g,'-').replace(/:/g,'-')
    .replace(/\//g,"_").replace(/{/g ,"").replace(/}/g ,"").replace(/@/g ,"-")
}

export function createPlugLine(id, classes, x1, y1, x2, y2){
    return { tag: 'line', id: id, class: classes, attributes: { x1: x1, y1: y1, x2: x2, y2: y2 } } 
}
export function createPlugCircle(id, slotId, moduleId, classes, cx, cy) { 
    return { tag: 'circle', id: id, class: classes, attributes: { cx: cx, cy: cy }, slotId, moduleId }
}

export function createPlug(type, plug, i, vMargin, height, count, plugLength, width) {

    let sgn = type == "input" ? -1 : 1
    let y = vMargin - height / 2 + i * (height/(count+1)) 
    let idSuff = plug.slotId + "_" + plug.moduleId
    let idPlug = `${type}-line_${idSuff}`
    let idSlot = `${type}-slot_${idSuff}`
    let base = {
        [idPlug]: createPlugLine(idPlug, `${type} plug ${plug.moduleId}`, sgn * width / 2, y, sgn * width / 2 + sgn * plugLength, y),
        [idSlot]: createPlugCircle(idSlot, plug.slotId, plug.moduleId, `${type} slot ${plug.moduleId}`, sgn * width / 2 + sgn * plugLength, y)
    }
    if(type=='input')
        return Object.assign({},base, { ['arrow-'+idPlug]: { tag:'path',  class:"input mdle-color-fill", attributes:{d:`M${-width/2-10},${y-7} l10,7 l-10,7 z` }}} )
    return base
}

export function genericModulePlotData({ module , icon, width, vMargin, vStep, inputs, outputs, actions} : 
    { module : ModuleFlux, icon:any, width: number, vMargin:number, vStep:number, inputs: any, outputs: any, actions:any }){

    let headerActions = FluxExtensionAPIs.get("BuilderView").getHeaderActions(module)
    actions = Object.assign({},actions, headerActions)
    const g = document.createElementNS("http://www.w3.org/2000/svg", "g")
    g.innerHTML = icon.content

    let headerHeight = 25;
    let plugLength = 20 
    let count = Math.max(1 , inputs.length ,  outputs.length )
    let height = 2 * vMargin + (count-1) * vStep
    let actionWidth = headerHeight - 5
    let actionsWidth =  Object.entries(actions).length*(actionWidth+5) - actionWidth/2
    width = width + actionsWidth
    let vStepInput = 50

    let toPlug = (type, plug, i) => createPlug(type, plug, i, vMargin, height, count, plugLength, width)
   
    let actionsItems = {
        tag:'g', style:{ transform:`translateX(${width/2 - actionsWidth}px) translateY(${-height/2}px)`},
        children: Object.entries(actions).reduce( (acc,[key,val],i) => {
            let patched = Object.assign({},val)
            patched['onclick'] = (e) => val['onclick'](e, module)  
            let action = {
                tag:'g',style:{transform:`translateX(${i*actionWidth}px) translateY(${headerHeight/2}px)`}, class:"module header-action",
                children:{
                    [key+"-bg"]:   { tag:'circle', attributes: { cx: `0px`, cy: `0px`, r:`${headerHeight/3}px` }, onclick: (e) => val['onclick'](e, module) },
                    [key+"-icon"]: { tag:'g', style:{transform:`translateX(-5.5px) translateY(-6.5px) scale(0.3)`}, children:{ content: patched }}
                }
            }
            return Object.assign({},acc, {[key]:action} )
        },{})
    }
    return {
        tag: "g",
        ondragenter: (event) => module.Factory.BuilderView.notifier$.next({ type: event.type, event: event, data: module }),
        ondragleave: (event) => module.Factory.BuilderView.notifier$.next({ type: event.type, event: event, data: module }),
        children: {
            content: { tag: "rect", class: "module content", attributes: { width, height, x: -width / 2, y: -height / 2, filter: "url(#shadow)" } },
            headerBg: {
                tag: "path", class: "module mdle-color-fill header",
                attributes: { d: `M${-width / 2},${-height / 2 + headerHeight} v${-(headerHeight - 10)} q0,-10 10,-10 h${width - 20} q10,0 10,10  v${headerHeight - 10} z` }
            },
            headerOutline: {
                tag: "path", class: "module header outline",
                attributes: { d: `M${-width / 2},${-height / 2 + headerHeight} v${-(headerHeight - 10)} q0,-10 10,-10 h${width - 20} q10,0 10,10  v${headerHeight - 10} ` }
            },
            title: {
                tag: "text", class: "module header title", textContent: module.configuration.title,
                attributes: { x: -width / 2 + 10, y: -height / 2 + headerHeight / 2 + 5 }
            },
            actions:actionsItems,
            icon: {
                tag: 'g', style: { transform: "translatey(10px) scale(1)" }, class: "module content icon",
                innerHTML: g.innerHTML
            },
            inputs: { tag: 'g', children: inputs.reduce((acc, input, i) => Object.assign(acc, toPlug('input', input, i)), {}) },
            outputs: { tag: 'g', children: outputs.reduce((acc, output, i) => Object.assign(acc, toPlug('output', output, i)), {}) }
        }
    }
}

export function genericModulePlot( 
    
    { module , icon, width, vMargin, vStep} : 
    { module : ModuleFlux, icon:any, width: number, vMargin:number, vStep:number }) : SVGElement {
        
    let data = genericModulePlotData({ module , icon, width, vMargin, vStep,
        inputs:module.inputSlots, outputs:module.outputSlots , actions:{}  })
    
    return createHTMLElement({ data, subscriptions: [], namespace: "svg" }) as unknown as SVGElement
}
