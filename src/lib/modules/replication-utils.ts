
import { PluginFlow, SideEffects, ModuleFlow, Connection, SlotRef, InputSlot, instanceOfSideEffects, } from "../module-flow/models-base"
import { Workflow, LayerTree } from "../flux-project/core-models"
import { SubscriptionStore } from '../module-flow/subscriptions-store';
import { ReplaySubject, Subscription, Observable } from 'rxjs';
import { Component } from './component.module';
import { renderTemplate } from '../module-flow/render-html';
import { take } from 'rxjs/operators';
import { toCssName } from '../module-flow/drawer-builder';
import { StaticStorage } from "../../index";
import { freeContract } from "../module-flow/contract";
import { Context } from "../module-flow/context";


export function duplicateComponent(component: Component.Module, idSuffix: string, parentStorage): Component.Module {

    /* Not sure how this function is behaving in case fo nested components/groups 
    */
    let staticStorage = new StaticStorage(idSuffix,parentStorage)
    let clonePatchLayerTree = (layerTree: LayerTree, filter = (mdleId: string) => true): LayerTree =>
        new LayerTree(layerTree.layerId + "_" + idSuffix, layerTree.title, layerTree.children.map(c => clonePatchLayerTree(c, filter)),
            layerTree.moduleIds.map(mId => mId + "_" + idSuffix))

    let workflowGetter = (newComponent) => {
        // this will 'freeze' the template from component at the time of duplicateComponent run 
        // Need to be improved; but at this stage it ensures no multiple subscriptions  
        if (newComponent._workflow)
            return newComponent._workflow

        let modules = component.getAllChildren()
        let connections = component.getConnections()

        let newModules : Array<ModuleFlow> = modules
            .filter((mdle: ModuleFlow) => /*!(mdle instanceof GroupModules.Module) &&*/ !(mdle instanceof PluginFlow))
            .map((mdle: ModuleFlow) => new mdle.Factory.Module(Object.assign({}, mdle, {
                moduleId: mdle.moduleId + "_" + idSuffix, workflowGetter, staticStorage })))

        let newPlugins =  modules
        .filter((mdle: ModuleFlow) => mdle instanceof PluginFlow)
        .map((plugin: PluginFlow<any>) =>{
             let parentModule = newModules.find( mdle => mdle.moduleId == plugin.parentModule.moduleId+ "_" + idSuffix)
             return new plugin.Factory.Module(Object.assign({}, plugin, 
                { moduleId: plugin.moduleId + "_" + idSuffix,
                  parentModule, staticStorage })) 
        });

        [...newModules, ...newPlugins].filter( m => instanceOfSideEffects(m) ).map( m => m.apply())

        let componentPlugins = []/*component.getWorkflow()
        .plugins.filter( mdle => mdle.parentModule===component && !(mdle instanceof ComponentReplica.Module) )
        */
        let newComponentPlugins = [] /*componentPlugins.map( mdle=>{
            return new mdle.Factory.Module(Object.assign({}, mdle, {moduleId: mdle.moduleId +"_"+idSuffix, parentModule:newComponent} )) 
        })*/

        let newInternalConnections = connections.internals.map((c: Connection) =>
            new Connection(new SlotRef(c.start.slotId, c.start.moduleId + "_" + idSuffix),
                new SlotRef(c.end.slotId, c.end.moduleId + "_" + idSuffix), c.adaptor))

        let newBridgeConnectionsIn = connections.implicits.inputs.map((c: Connection) =>
            new Connection(new SlotRef(c.start.slotId, c.start.moduleId), new SlotRef(c.end.slotId, c.end.moduleId + "_" + idSuffix), c.adaptor))
        let newBridgeConnectionsOut = connections.implicits.outputs.map((c: Connection) =>
            new Connection(new SlotRef(c.start.slotId, c.start.moduleId + "_" + idSuffix), new SlotRef(c.end.slotId, c.end.moduleId), c.adaptor))
        let newExplicitConnectionsIn = connections.explicits.inputs.map((c: Connection) =>
            new Connection(new SlotRef(c.start.slotId, c.start.moduleId), new SlotRef(c.end.slotId, c.end.moduleId + "_" + idSuffix), c.adaptor))
        let newExplicitConnectionsOut = connections.explicits.outputs.map((c: Connection) =>
            new Connection(new SlotRef(c.start.slotId, c.start.moduleId + "_" + idSuffix), new SlotRef(c.end.slotId, c.end.moduleId), c.adaptor))

        let connections0 = component.getWorkflow().connections
        let pluginsConnections = connections0.filter((c: Connection) =>
            componentPlugins.map(mdle => mdle.moduleId).includes(c.start.moduleId))
            .map(c =>
                new Connection(new SlotRef(c.start.slotId, c.start.moduleId + "_" + idSuffix), new SlotRef(c.end.slotId, c.end.moduleId), c.adaptor)
            )
        let newConnections = [...newInternalConnections, ...newBridgeConnectionsIn, ...newBridgeConnectionsOut,
        ...pluginsConnections, ...newExplicitConnectionsIn, ...newExplicitConnectionsOut]
        let layers = clonePatchLayerTree(component.getLayerTree())

        let workflow = new Workflow(newModules, newConnections, newPlugins, layers)

        let subscriptionsStore = new SubscriptionStore()
        subscriptionsStore.update(
            [...newModules,...newPlugins, ...newComponentPlugins, newComponent, ...component.getWorkflow().modules], newConnections, []);

        (workflow as any).subscriptionsStore = subscriptionsStore
        newComponent._workflow = workflow
        return workflow
    }

    let layout = document.createElement('div')
    layout.innerHTML = component.configuration.data.layout
    layout.querySelectorAll(".flux-component").forEach(e => e.id += "_" + idSuffix)
    let conf = component.configuration
    let newConfData = Object.assign({}, conf.data, { layout: layout.innerHTML })
    let newConf = new component.Factory.Configuration({ title: conf.title, description: conf.description, data: newConfData, schemas: conf.schema })

    let newComponent = new component.Factory.Module(Object.assign({}, component, {
        workflowGetter,
        configuration: newConf,
        layerId: component.getLayerTree().layerId + "_" + idSuffix,
        moduleId: component.moduleId + "_" + idSuffix,
        moduleIds: component.getDirectChildren().map(m => m.moduleId).map(mid => mid + "_" + idSuffix)
    }))

    return newComponent
}


export abstract class RenderViewDecorator extends PluginFlow<Component.Module> implements SideEffects {

    decoratedDiv : HTMLDivElement
    originalElement$: Observable<HTMLDivElement>

    constructor( params ){
        super(params)
        this.originalElement$ = this.parentModule.renderedElementDisplayed$
    }

    abstract decorate(templateDiv: HTMLDivElement)

    apply(){
        if(!this.originalElement$)
            return 
        this.originalElement$.pipe(
            take(1)
        ).subscribe(
            (templateDiv:HTMLDivElement) => {
                templateDiv.classList.add("flux-builder-view-only")
                let parent = templateDiv.parentElement
                this.decoratedDiv = this.decorate(templateDiv)
                parent.innerHTML = ""
                parent.appendChild(this.decoratedDiv)
                this["renderedElementDisplayed$"].next(this.decoratedDiv)
                this.parentModule.renderedElementDisplayed$.next(this.decoratedDiv)   
            }
        )
    }

    dispose(){
        if(!this.originalElement$)
            return 
        this.originalElement$.pipe(
            take(1)
        ).subscribe( (renderedDiv:HTMLDivElement) => {
            let parent = this.decoratedDiv.parentElement
            parent.innerHTML = ""
            parent.appendChild(renderedDiv)
            renderedDiv.classList.remove("flux-template")
        })
    }
}

export abstract class ReplicaDataBase{

    replicaId: string
    component: Component.Module
    input: {data:any, configuration: any, context: any}

    constructor({replicaId, component, input}:
                { replicaId : string,
                  component: Component.Module,
                  input: {data:any, configuration: any, context: any}} ){
        this.replicaId = replicaId
        this.component = component
        this.input = input
    }

    abstract innerContext() : {[key:string]: any};
}

export abstract class ReplicatorModuleBase<TReplica extends ReplicaDataBase>  extends RenderViewDecorator {

    replicas = new Map<string, TReplica>()
    subscriptions = new Array<Subscription>()

    replayedInstance$ = new ReplaySubject<TReplica>()
    newInstance$ = new ReplaySubject<TReplica>()
    setInstances$ = new ReplaySubject<Array<TReplica>>()

    renderedElementDisplayed$ = new ReplaySubject<HTMLDivElement>(1)

    renderedDiv : HTMLDivElement

    constructor(params) {
        super(params)
        this.parentModule.getAllSlots().inputs.explicits.forEach((inputSlot: InputSlot, i: number) => {
            this.addInput({
                id:"dispatch_" + inputSlot.slotId, 
                description: "dispatcher",
                contract: freeContract(),
                onTriggered: ({data, configuration, context}) =>
                    this.dispatchOrCreate(i, data, configuration, context)
            }) 
        })
    }

    abstract getReplicaId(data, config, context)

    abstract createReplicaData(argsReplicaData: { 
        replicaId : string,
        component: Component.Module,
        input: {data:any, configuration: any, context: any}}) : TReplica
    
    dispatchOrCreate(indexSlot: number, data: unknown, config: unknown, context: Context) {

        if(Array.isArray(data) ){
            // In case of Array the current list of replicas is first cleared
            // Then, brand news are created for each element of the array
            let replicaIds = data.map( d => {
                return toCssName(this.getReplicaId(d, config, context)) 
            })
            let toRemove = Array.from(this.replicas.keys()).filter( k => !replicaIds.includes(k))

            toRemove.forEach( replicaId => {
                let replica = this.replicas.get(replicaId)
                replica.component['_workflow'] && replica.component['_workflow'].subscriptionsStore.clear()
                replica.component.disposeChildrenSideEffects()
                this.replicas.delete(replicaId)
            })
            
            let replicas = data.map( d => {
                let replicaId = toCssName(this.getReplicaId(d, config, context))
                let replica = this.replicas.has(replicaId) 
                    ? this.replicas.get(replicaId)
                    : this.newReplica(replicaId,data, config, context)

                //let newContext = { ...context, ...replica.innerContext()}
                context.withChild(
                    'emit data to replica',
                    (context) => replica.component.internalEntries[indexSlot].next({ data: d, context }),
                    replica.innerContext()
                ) 
                this.replicas.set(replica.replicaId, replica)
                return replica
            })
            this.setInstances$.next(replicas)
            return
        }
        let replicaId = toCssName(this.getReplicaId(data, config, context))

        let replica = this.replicas.get(replicaId) 
            ? this.replicas.get(replicaId) 
            : this.newReplica(replicaId,data, config, context)

        context.withChild(
            'emit data to replica',
            (context) => replica.component.internalEntries[indexSlot].next({ data, context }),
            replica.innerContext()
        )            

        if (!this.replicas.get(replicaId)) {
            this.replicas.set(replicaId, replica)
            this.newInstance$.next(replica)
            return
        }
        this.replayedInstance$.next(replica)
    }

    dispose(){
        super.dispose() 
        this.replicas.forEach( replica => {
            replica.component['_workflow'] && replica.component['_workflow'].subscriptionsStore.clear()
            replica.component.disposeChildrenSideEffects()
        })
    }

    newReplica(replicaId, data, configuration, context) : TReplica {
        
        let component = duplicateComponent(this.parentModule, replicaId, this.parentModule.staticStorage)
        component.getAllChildren()
        return this.createReplicaData({replicaId,component,input:{data,configuration,context}})
    }

    cloneHTML(replicaData: ReplicaDataBase, templateDiv: HTMLDivElement) : HTMLDivElement{

        let divContent = cloneComponentHtml(replicaData.component, templateDiv, replicaData.replicaId)
        divContent.id = replicaData.component.moduleId
        divContent.classList.add("flux-element", "replica", this.parentModule.moduleId)
        divContent.classList.remove("flux-builder-only")
        return divContent
    }
}


export function cloneComponentHtml(mdle: Component.Module, layout: HTMLDivElement, instanceSuffix) {

    let newLayout = layout.cloneNode(true) as HTMLDivElement
    newLayout.querySelectorAll(".flux-element").forEach((item) => {
        if (!item.classList.contains("flux-component"))
            item.innerHTML = ""
        item.id += "_" + instanceSuffix
    })
    renderTemplate(newLayout, mdle.getAllChildren())
    return newLayout
}


