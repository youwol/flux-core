import { LayerTree, Workflow } from '../flux-project/core-models';
import { ModuleFlow, Connection, SlotRef, Pipe,  
    instanceOfSideEffects } from '../module-flow/models-base';
import { Schemas } from './schemas'
import { Flux, BuilderView, Schema } from '../module-flow/decorators'
import { createHTMLElement } from './reactive-html'
import { packCore } from './factory-pack-core';
import { createPlug, createPlugCircle, genericModulePlotData } from '../module-flow/drawer-builder';
import { StaticStorage } from '../../index';
import { freeContract } from '../module-flow/contract';
import { Context } from '../module-flow/context';


export namespace GroupModules {

    export let svgIcon = `<path d="M333.3,269.8h-35.7c-4.8,0-8.7-3.9-8.7-8.7v-23.7c0-4.8,3.9-8.7,8.7-8.7h35.7c4.8,0,8.7,3.9,8.7,8.7v23.7  C342,265.9,338.1,269.8,333.3,269.8z M297.7,234.8c-1.5,0-2.7,1.2-2.7,2.7v23.7c0,1.5,1.2,2.7,2.7,2.7h35.7c1.5,0,2.7-1.2,2.7-2.7  v-23.7c0-1.5-1.2-2.7-2.7-2.7H297.7z"/>
<path d="M406.8,233.8h-35.7c-4.8,0-8.7-3.9-8.7-8.7v-23.7c0-4.8,3.9-8.7,8.7-8.7h35.7c4.8,0,8.7,3.9,8.7,8.7v23.7  C415.5,229.9,411.6,233.8,406.8,233.8z M371.2,198.8c-1.5,0-2.7,1.2-2.7,2.7v23.7c0,1.5,1.2,2.7,2.7,2.7h35.7c1.5,0,2.7-1.2,2.7-2.7  v-23.7c0-1.5-1.2-2.7-2.7-2.7H371.2z"/>
<path d="M406.8,305.8h-35.7c-4.8,0-8.7-3.9-8.7-8.7v-23.7c0-4.8,3.9-8.7,8.7-8.7h35.7c4.8,0,8.7,3.9,8.7,8.7v23.7  C415.5,301.9,411.6,305.8,406.8,305.8z M371.2,270.8c-1.5,0-2.7,1.2-2.7,2.7v23.7c0,1.5,1.2,2.7,2.7,2.7h35.7c1.5,0,2.7-1.2,2.7-2.7  v-23.7c0-1.5-1.2-2.7-2.7-2.7H371.2z"/>
<path d="M501.8,233.8h-51.7c-4.8,0-8.7-3.9-8.7-8.7v-23.7c0-4.8,3.9-8.7,8.7-8.7h51.7c4.8,0,8.7,3.9,8.7,8.7v23.7  C510.5,229.9,506.6,233.8,501.8,233.8z M450.2,198.8c-1.5,0-2.7,1.2-2.7,2.7v23.7c0,1.5,1.2,2.7,2.7,2.7h51.7c1.5,0,2.7-1.2,2.7-2.7  v-23.7c0-1.5-1.2-2.7-2.7-2.7H450.2z"/>
<path d="M536.8,305.8h-35.7c-4.8,0-8.7-3.9-8.7-8.7v-23.7c0-4.8,3.9-8.7,8.7-8.7h35.7c4.8,0,8.7,3.9,8.7,8.7v23.7  C545.5,301.9,541.6,305.8,536.8,305.8z M501.2,270.8c-1.5,0-2.7,1.2-2.7,2.7v23.7c0,1.5,1.2,2.7,2.7,2.7h35.7c1.5,0,2.7-1.2,2.7-2.7  v-23.7c0-1.5-1.2-2.7-2.7-2.7H501.2z"/>
<path d="M412.5,287.3v-4c6.2,0,9.4-15.2,12.2-28.6c3.7-18,7.6-36.7,19.8-36.7v4c-9,0-12.7,17.8-15.9,33.5  C425.2,271.8,422,287.3,412.5,287.3z"/>
<rect x="412.5" y="206.9" width="32" height="4"/>
<path d="M339,242.5v-4c6,0,7.4-5.2,9.2-13.7c1.9-9.1,4.2-20.4,17.9-20.4v4c-10.4,0-12.1,8.3-14,17.2  C350.5,233.6,348.6,242.5,339,242.5z"/>
<path d="M366,295.5c-13.7,0-16-11.3-17.9-20.4c-1.7-8.5-3.1-13.7-9.2-13.7v-4c9.6,0,11.5,9,13.1,16.9c1.8,8.8,3.5,17.2,14,17.2  V295.5z"/>
<path d="M521,267.8h-4c0-11.9-9.2-13.7-19.7-15.8c-10.9-2.2-23.3-4.6-23.3-20.2h4c0,12.3,9.3,14.1,20,16.2  C508.8,250.2,521,252.6,521,267.8z"/>`


    export let id = "group"
    export let uid = "group@flux-pack-core"
    export let displayName = "Group"


    function getGroupConnections(moduleId: string, connections: Array<Connection>, allChildrenIds: Array<string>) {

        let implicitInputConnections = connections.filter((c: Connection) =>
            allChildrenIds.includes(c.end.moduleId) &&
            !allChildrenIds.includes(c.start.moduleId) &&
            c.start.moduleId != moduleId
        )
        let implicitOutputConnections = connections.filter((c: Connection) =>
            !allChildrenIds.includes(c.end.moduleId) &&
            allChildrenIds.includes(c.start.moduleId) &&
            c.end.moduleId != moduleId
        )
        let explicitInputConnections = connections.filter((c: Connection) =>
            c.end.moduleId == moduleId && !allChildrenIds.includes(c.start.moduleId)
        )
        let explicitOutputConnections = connections.filter((c: Connection) =>
            c.start.moduleId == moduleId && !allChildrenIds.includes(c.end.moduleId)
        )

        let internalConnections = connections.filter((c: Connection) =>
            [...allChildrenIds, moduleId].includes(c.end.moduleId) &&
            [...allChildrenIds, moduleId].includes(c.start.moduleId)
        )
        return {
            internals: internalConnections, implicits: { inputs: implicitInputConnections, outputs: implicitOutputConnections },
            explicits: { inputs: explicitInputConnections, outputs: explicitOutputConnections }
        }
    }

    @Schema({
        pack: packCore,
        description: "Persistent Data of GroupModule"
    })
    export class PersistentData extends Schemas.GroupModuleConfiguration {

        constructor({ ...others } = {}) {

            super(Object.assign(others, {}) as any)
        }
    }

    @Flux({
        pack: packCore,
        namespace: GroupModules,
        id: "GroupModules",
        displayName: "GroupModules",
        description: "Group modules"
    })
    @BuilderView({
        namespace: GroupModules,
        render: (mdle, icon) => groupModulePlot({ module: mdle, icon: icon, width: 150, vMargin: 50, vStep: 25 }),
        icon: svgIcon
    })
    export class Module extends ModuleFlow{

        public readonly layerId: string
        public readonly workflowGetter: (instance: Module) => Workflow

        public readonly internalEntries = new Array<Pipe<any>>()
        public readonly explicitOutputs = new Array<Pipe<any>>()
        public readonly internalEntrySlots = new Array<SlotRef>()
        public readonly internalExitSlots = new Array<SlotRef>()

        public readonly staticStorage: StaticStorage

        constructor(params) {
            super(params)
            this.staticStorage = params.staticStorage
            this.layerId = params.layerId
            this.workflowGetter = params.workflowGetter
            let staticConf = this.getConfiguration<PersistentData>()

            for (let i = 0; i < staticConf.explicitInputsCount; i++) {

                this.internalEntrySlots.push(new SlotRef(`explicitInput${i}_in`, this.moduleId))
                let internalEntry = this.addOutput({id:`explicitInput${i}_in`})
                this.internalEntries.push(internalEntry)
                this.addInput({

                    id: `explicitInput${i}`, 
                    description: "explicit input of the module",
                    contract:freeContract(),
                    onTriggered: ( 
                        {data, configuration, context} : {data: unknown, configuration: PersistentData, context: Context}
                        ) => {
                        /*
                        let confEnv = typeof configuration.environment == "string" ?
                            new Function(configuration.environment)() :
                            configuration.environment
                        let ctxEnv = context && context.environment ? context.environment : {}
                        let environment = Object.assign({}, ctxEnv, confEnv)
                        let userCtx = Object.assign({}, context, { environment })
                        let ctx = new Context("",userCtx)
                        internalEntry.next({ data, context: newContext })
                        */
                        internalEntry.next({ data, context })
                    }
                })
            }

            for (let i = 0; i < staticConf.explicitOutputsCount; i++) {

                this.internalExitSlots.push(new SlotRef(`explicitOutput${i}_in`, this.moduleId))
                let externalOut = this.addOutput({id:`explicitOutput${i}`})
                this.explicitOutputs.push(externalOut)
                this.addInput({
                    id:`explicitOutput${i}_in`, 
                    description: 'input side of an explicit output',
                    contract:undefined,
                    onTriggered: (data, _, context) => {
                        externalOut.next({ data, context })
                    }
                })
            }
        }

        applyChildrenSideEffects(){
            this.getAllChildren().forEach( mdle => {
                instanceOfSideEffects(mdle) && mdle.apply() 
            })
        }

        disposeChildrenSideEffects(){
            this.getAllChildren().forEach( mdle => {
                instanceOfSideEffects(mdle) && mdle.dispose() 
            })
        }
        
        getWorkflow(): Workflow {
            return this.workflowGetter(this)
        }

        getAllChildren(): Array<ModuleFlow> {

            let workflow = this.workflowGetter(this)
            let layer = workflow.rootLayerTree.getLayerRecursive((layer) => layer.layerId == this.layerId)
            let modulesId = layer.getChildrenModules()
            let plugins = workflow.plugins.filter(plugin => {
                return plugin.parentModule && modulesId.includes(plugin.parentModule.moduleId) // (plugin instanceof PluginFlow) better => but need only one flux-lib-core loaded
            })
            let modules = modulesId.map(mid => workflow.modules.find(mdle => mdle.moduleId == mid))
            return [...modules, ...plugins]
        }

        getDirectChildren(): Array<ModuleFlow> {

            let workflow = this.workflowGetter(this)
            let layer = workflow.rootLayerTree.getLayerRecursive( (layer) => layer.layerId == this.layerId)
            let chidlrenId = layer.moduleIds
            let plugins = workflow.plugins.filter(plugin => chidlrenId.includes(plugin.parentModule.moduleId))
            let modules = chidlrenId.map(mid => workflow.modules.find(mdle => mdle.moduleId == mid))
            return [...modules, ...plugins]
        }

        getConnections() {

            let workflow = this.workflowGetter(this)
            let allModulesId = this.getAllChildren().map(mdle => mdle.moduleId)
            return getGroupConnections(this.moduleId, workflow.connections, allModulesId)
        }

        getAllSlots(): {
            inputs: { implicits: Array<SlotRef>, explicits: Array<SlotRef> },
            outputs: { implicits: Array<SlotRef>, explicits: Array<SlotRef> }
        } {
            let workflow = this.workflowGetter(this)
            let layer = workflow && workflow.rootLayerTree 
                ? workflow.rootLayerTree.getLayerRecursive((layer) => layer.layerId == this.layerId) 
                : undefined

            if (!layer)
                return {
                    inputs: { implicits: [], explicits: this.getExplicitInputs() },
                    outputs: { implicits: [], explicits: this.getExplicitOutputs() }
                }

            let allModulesId = this.getAllChildren().map(mdle => mdle.moduleId)

            let groupConnections = getGroupConnections(this.moduleId, workflow.connections, allModulesId)
            let implicitInputs = new Set(groupConnections.implicits.inputs.map(connection => connection.end))
            let implicitOutputs = new Set(groupConnections.implicits.outputs.map(connection => connection.start))

            return {
                inputs: { implicits: [...implicitInputs], explicits: this.getExplicitInputs() },
                outputs: { implicits: [...implicitOutputs], explicits: this.getExplicitOutputs() }
            }
        }

        getAllInputSlots(): Array<SlotRef> {
            let all = this.getAllSlots()
            return [...all.inputs.explicits, ...all.inputs.implicits]
        }

        getAllOutputSlots(): Array<SlotRef> {
            let all = this.getAllSlots()
            return [...all.outputs.explicits, ...all.outputs.implicits]
        }

        getExplicitInputs(): Array<SlotRef> {
            return this.inputSlots.filter((out) => !this.internalExitSlots.map(out => out.slotId).includes(out.slotId))
        }

        getExplicitOutputs(): Array<SlotRef> {
            return this.outputSlots.filter((out) => !this.internalEntrySlots.map(out => out.slotId).includes(out.slotId))
        }

        getLayerTree(): LayerTree {
            let workflow = this.workflowGetter(this)
            let layer = workflow.rootLayerTree.getLayerRecursive((layer) => layer.layerId == this.layerId)
            return layer
        }
    }

    //----------------
    // Plots
    //----------------

    let createPlugGroupMdle = (type, plug, i, groupModule, vMargin, height, vStepInput, plugLength, width, expanded) => {

        let inverse = (type) => type == "input" ? "output" : "input"

        let base = createPlug(type, plug, i, vMargin, height, vStepInput, plugLength, width)
        if (!expanded)
            return base
        let internalSlot = type == "input" ? groupModule.internalEntrySlots[i] : groupModule.internalExitSlots[i]
        let idSlotIn = `${inverse(type)}-slot_${internalSlot.slotId}_${plug.moduleId}`
        let sgn = type == "input" ? -1 : 1
        return Object.assign(base, {
            [idSlotIn]: createPlugCircle(idSlotIn, internalSlot.slotId, internalSlot.moduleId, `slot ${inverse(type)} explicit`, sgn * width / 2, vMargin - height / 2 + i * vStepInput)
        })
    }

    export function groupModulePlot({ module, icon, width, vStep }:
        { module: Module, icon: any, width: number, vMargin: number, vStep: number }): HTMLElement {

        let data = genericModulePlotData({
            module,
            icon,
            width,
            vMargin: 50,
            vStep: 25,
            inputs: module.getAllInputSlots(),
            outputs: module.getAllOutputSlots(),
            actions: {
                expand: {
                    tag: 'g', style: { transform: `scale(0.083)` },
                    children: [
                        {
                            tag: 'path',
                            attributes: { d: "M448 344v112a23.94 23.94 0 0 1-24 24H312c-21.39 0-32.09-25.9-17-41l36.2-36.2L224 295.6 116.77 402.9 153 439c15.09 15.1 4.39 41-17 41H24a23.94 23.94 0 0 1-24-24V344c0-21.4 25.89-32.1 41-17l36.19 36.2L184.46 256 77.18 148.7 41 185c-15.1 15.1-41 4.4-41-17V56a23.94 23.94 0 0 1 24-24h112c21.39 0 32.09 25.9 17 41l-36.2 36.2L224 216.4l107.23-107.3L295 73c-15.09-15.1-4.39-41 17-41h112a23.94 23.94 0 0 1 24 24v112c0 21.4-25.89 32.1-41 17l-36.19-36.2L263.54 256l107.28 107.3L407 327.1c15.1-15.2 41-4.5 41 16.9z" }
                        }
                    ],
                    onclick: (d) => module.Factory.BuilderView.notifier$.next({ type: 'layerFocused', data: module.layerId })
                }
            }
        })
        return createHTMLElement({ data, subscriptions: [], namespace: "svg" })
    }


    export function expandedGroupPlot(groupModule: Module) {

        return (d) => {
            let [headerHeight, padding, vStepInput, vMargin, plugLength] = [25, 25, 25, 25, 50];
            let width = d.data.boundingBox.width
            let height = d.data.boundingBox.height
            let inputs = groupModule.getExplicitInputs()
            let outputs = groupModule.getExplicitOutputs()

            let toPlug = (type, plug, i) => createPlugGroupMdle(type, plug, i, groupModule, vMargin, height, vStepInput, plugLength, width, true)

            let data = {
                tag: "g",
                moduleId:groupModule.moduleId,
                children: {
                    content: { tag: "rect", class: ["active-layer content"], attributes: { width, height, x: -width / 2, y: -height / 2, filter: "url(#shadow)" } },
                    headerBg: {
                        tag: "path", class: "active-layer mdle-color-fill header",
                        attributes: { d: `M${-width / 2},${headerHeight - padding - height / 2} v${-(headerHeight - 10)} q0,-10 10,-10 h${width - 20} q10,0 10,10  v${headerHeight - 10} z` }
                    },
                    headerOutline: {
                        tag: "path", class: "active-layer header outline",
                        attributes: { d: `M${-width / 2},${headerHeight - padding - height / 2} v${-(headerHeight - 10)} q0,-10 10,-10 h${width - 20} q10,0 10,10  v${headerHeight - 10}` }
                    },
                    title: {
                        tag: "text", class: "module header title", textContent: groupModule.configuration.title,
                        attributes: { x: -width / 2 + 10, y: -height / 2 - 5 }
                    },
                    toggle: {
                        tag: 'g', style: { transform: `translateX(${width /2 - headerHeight / 2}px) translateY(${-height/2 - headerHeight / 2}px)` }, class: "module header-action",
                        children: {
                            "reduce-bg": { 
                                tag: 'circle', attributes: { r: `${headerHeight / 3}px` },
                                onclick: () => groupModule.Factory.BuilderView.notifier$.next({ type: 'closeLayer', data: groupModule.layerId }) 
                            },
                            "reduce-icon": { 
                                tag:'g', style:{transform:`translateX(-4px) translateY(-6.5px) scale(0.3)`}, 
                                children:{ 
                                    content:{
                                        tag:'g',style:{ transform:`scale(0.083)`},
                                        children: {
                                            reduce:{tag:'path', 
                                            attributes:{d:"M242.72 256l100.07-100.07c12.28-12.28 12.28-32.19 0-44.48l-22.24-22.24c-12.28-12.28-32.19-12.28-44.48 0L176 189.28 75.93 89.21c-12.28-12.28-32.19-12.28-44.48 0L9.21 111.45c-12.28 12.28-12.28 32.19 0 44.48L109.28 256 9.21 356.07c-12.28 12.28-12.28 32.19 0 44.48l22.24 22.24c12.28 12.28 32.2 12.28 44.48 0L176 322.72l100.07 100.07c12.28 12.28 32.2 12.28 44.48 0l22.24-22.24c12.28-12.28 12.28-32.19 0-44.48L242.72 256z"}}
                                },
                                onclick: () => groupModule.Factory.BuilderView.notifier$.next({ type: 'closeLayer', data: groupModule.layerId }) 
                            }} }}
                    },
                    inputs: { tag: 'g', children: inputs.reduce((acc, input, i) => Object.assign(acc, toPlug('input', input, i)), {}) },
                    outputs: { tag: 'g', children: outputs.reduce((acc, output, i) => Object.assign(acc, toPlug('output', output, i)), {}) },
                }
            }
            return createHTMLElement({ data, subscriptions: [], namespace: "svg" }) as any
        }
    }
}