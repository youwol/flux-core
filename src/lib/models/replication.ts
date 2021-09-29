
import { PluginFlux, StaticStorage, SideEffects, ModuleFlux, Connection, SlotRef, InputSlot, instanceOfSideEffects, toCssName, renderTemplate, ModuleConfiguration, } from "../models"
import { SubscriptionStore } from './subscriptions-store';
import { ReplaySubject, Subscription, Observable } from 'rxjs';
import { take } from 'rxjs/operators';
import { Component } from "../modules/component.module";
import { LayerTree, Workflow } from "../flux-project/core-models";
import { freeContract } from "./contract";


export function replicateComponentFlux(
    component: Component.Module, 
    parentStorage: StaticStorage,
    idSuffix?: string, 
    ): Component.Module {

    /* Not sure how this function is behaving in case fo nested components/groups 
    */
    let staticStorage = new StaticStorage(idSuffix,parentStorage)
    let replicaId = (id) =>  (idSuffix!=undefined && idSuffix!="") ? `${id}_${idSuffix}` : id

    let clonePatchLayerTree = (layerTree: LayerTree, filter = (mdleId: string) => true): LayerTree =>
        new LayerTree({
            layerId: replicaId(layerTree.layerId), 
            title: layerTree.title, 
            children: layerTree.children.map(c => clonePatchLayerTree(c, filter)),
            moduleIds: layerTree.moduleIds.map(replicaId),
            html: layerTree.html,
            css: layerTree.css
        })

    let workflowGetter = (newComponent) => {
        // this will 'freeze' the template from component at the time of duplicateComponent run 
        // Need to be improved; but at this stage it ensures no multiple subscriptions  
        if (newComponent._workflow)
            return newComponent._workflow

        let modules = component.getAllChildren()
        let connections = component.getConnections()

        let newModules : Array<ModuleFlux> = modules
            .filter((mdle: ModuleFlux) => /*!(mdle instanceof GroupModules.Module) &&*/ !(mdle instanceof PluginFlux))
            .map((mdle: ModuleFlux) => 
                new mdle.Factory.Module(
                    Object.assign(
                        {}, 
                        mdle, 
                        {moduleId: replicaId(mdle.moduleId), workflowGetter, staticStorage })
                    )
                )

        let newPlugins =  modules
        .filter((mdle: ModuleFlux) => mdle instanceof PluginFlux)
        .map((plugin: PluginFlux<any>) =>{
             let parentModule = newModules.find( mdle => mdle.moduleId == replicaId(plugin.parentModule.moduleId))
             return new plugin.Factory.Module(
                 Object.assign(
                    {}, 
                    plugin, 
                    { moduleId: replicaId(plugin.moduleId), parentModule, staticStorage })) 
        });

        [...newModules, ...newPlugins].filter( m => instanceOfSideEffects(m) ).map( m => m.apply())

        let componentPlugins = []/*component.getWorkflow()
        .plugins.filter( mdle => mdle.parentModule===component && !(mdle instanceof ComponentReplica.Module) )
        */
        let newComponentPlugins = [] /*componentPlugins.map( mdle=>{
            return new mdle.Factory.Module(Object.assign({}, mdle, {moduleId: mdle.moduleId +"_"+idSuffix, parentModule:newComponent} )) 
        })*/

        let newInternalConnections = connections.internals.map((c: Connection) =>
            new Connection(
                new SlotRef(c.start.slotId, replicaId(c.start.moduleId)),
                new SlotRef(c.end.slotId, replicaId(c.end.moduleId)), c.adaptor)
                )
        let newBridgeConnectionsIn = connections.implicits.inputs.map((c: Connection) =>
            new Connection(
                new SlotRef(c.start.slotId, c.start.moduleId), 
                new SlotRef(c.end.slotId, replicaId(c.end.moduleId)), c.adaptor)
                )
        let newBridgeConnectionsOut = connections.implicits.outputs.map((c: Connection) =>
            new Connection(
                new SlotRef(c.start.slotId, replicaId(c.start.moduleId)), 
                new SlotRef(c.end.slotId, c.end.moduleId), c.adaptor)
                )
        let newExplicitConnectionsIn = connections.explicits.inputs.map((c: Connection) =>
            new Connection(
                new SlotRef(c.start.slotId, c.start.moduleId), 
                new SlotRef(c.end.slotId, replicaId(c.end.moduleId)), c.adaptor)
                )
        let newExplicitConnectionsOut = connections.explicits.outputs.map((c: Connection) =>
            new Connection(
                new SlotRef(c.start.slotId, replicaId(c.start.moduleId)), 
                new SlotRef(c.end.slotId, c.end.moduleId), c.adaptor)
                )

        let connections0 = component.getWorkflow().connections
        let pluginsConnections = connections0.filter((c: Connection) =>
            componentPlugins.map(mdle => mdle.moduleId).includes(c.start.moduleId))
            .map(c =>
                new Connection(
                    new SlotRef(c.start.slotId, replicaId(c.start.moduleId)), 
                    new SlotRef(c.end.slotId, c.end.moduleId), c.adaptor)
            )
        let newConnections = [
            ...newInternalConnections, 
            ...newBridgeConnectionsIn, 
            ...newBridgeConnectionsOut,
            ...pluginsConnections, 
            ...newExplicitConnectionsIn, 
            ...newExplicitConnectionsOut
        ]

        let workflow = new Workflow({
            modules:newModules, 
            connections: newConnections, 
            plugins: newPlugins
        })

        let subscriptionsStore = new SubscriptionStore()
        subscriptionsStore.update([
            ...newModules,
            ...newPlugins,
            ...newComponentPlugins, 
            newComponent, 
            ...component.getWorkflow().modules
        ], newConnections, []);

        (workflow as any).subscriptionsStore = subscriptionsStore
        newComponent._workflow = workflow
        return workflow
    }

    let newConf = new ModuleConfiguration({
        ...component.configuration,
        data: new Component.PersistentData(component.configuration.data)
    })

    let newComponent = new component.Factory.Module(Object.assign({}, component, {
        workflowGetter,
        configuration: newConf,
        layerId: replicaId(component.moduleId),
        moduleId: replicaId(component.moduleId),
        moduleIds: component.getDirectChildren().map(m => m.moduleId).map(replicaId)
    }))

    return newComponent
}



export function replicateComponentHtml(mdle: Component.Module, layout: HTMLDivElement, instanceSuffix?:string) {

    let newLayout = layout.cloneNode(true) as HTMLDivElement
    newLayout.querySelectorAll(".flux-element").forEach((item) => {
        if (!item.classList.contains("flux-component"))
            item.innerHTML = ""
        if(instanceSuffix)
            item.id += "_" + instanceSuffix
    })
    renderTemplate(newLayout, mdle.getAllChildren())
    return newLayout
}


