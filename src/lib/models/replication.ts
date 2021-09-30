
import { PluginFlux, StaticStorage, ModuleFlux, Connection, SlotRef, instanceOfSideEffects } from "../models"
import { SubscriptionStore } from './subscriptions-store';
import { Workflow } from "../flux-project/core-models";
import { GroupModules } from "../modules/group.module";
import { Component } from "../modules/component.module";



export function duplicateWorkflow({rootComponent, indexEntryPoint, name}:{
    rootComponent: GroupModules.Module,
    indexEntryPoint: number
    name: string
}) : { rootComponent: GroupModules.Module, workflow: Workflow, subscriptionsStore: SubscriptionStore} {

    let replicaId = (id) => id
    let staticStorage = new StaticStorage(name, rootComponent.staticStorage)

    let modules = [rootComponent, ...rootComponent.getAllChildren()]
    let connections = rootComponent.getConnections()

    let newModules: Array<ModuleFlux> = modules
        .filter((mdle: ModuleFlux) => !(mdle instanceof PluginFlux))
        .map((mdle: ModuleFlux, i) => {
            let replicaMdle = new mdle.Factory.Module({
                ...mdle,
                moduleId: replicaId(mdle.moduleId), 
                staticStorage,
                userData: {replicaId: name}
            })
            if(replicaMdle instanceof GroupModules.Module)
                console.log("ReplicaMdle", replicaMdle)
            return replicaMdle
        })

    let newPlugins = modules
        // we do not include the plugins of the root component: they are considered 'outside'
        // not really sure about it
        .filter((mdle: ModuleFlux) => mdle instanceof PluginFlux && mdle.parentModule != rootComponent)
        .map((plugin: PluginFlux<any>) => {

            let parentModule = newModules.find(mdle => mdle.moduleId == replicaId(plugin.parentModule.moduleId))
            let replicaPlugin = new plugin.Factory.Module({
                ...plugin,
                moduleId: replicaId(plugin.moduleId), 
                parentModule, 
                staticStorage,
                userData: {replicaId: name}
            })
            
            if (plugin.moduleId.includes("ComponentReplica"))
                console.log("INSTANTIATED COPY OF PLUGIN " + plugin.parentModule.configuration.title,
                    { id: replicaPlugin.moduleId, uuid: replicaPlugin['uuid'] }
                )
            return replicaPlugin
        });

    [...newModules, ...newPlugins].filter(m => instanceOfSideEffects(m)).map(m => m.apply())

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
    let newExplicitConnectionsIn = connections.explicits.inputs
    // we should not add the connection that is connected to the entry point
    .filter( (c:Connection) => {
        if(c.end.moduleId==rootComponent.moduleId && c.end.slotId == `explicitInput${indexEntryPoint}`)
            return false
        return true
    })
    .map((c: Connection) => {
        
        return new Connection(
            new SlotRef(c.start.slotId, c.start.moduleId),
            new SlotRef(c.end.slotId, replicaId(c.end.moduleId)), c.adaptor)
        })
    let newExplicitConnectionsOut = connections.explicits.outputs.map((c: Connection) =>
        new Connection(
            new SlotRef(c.start.slotId, replicaId(c.start.moduleId)),
            new SlotRef(c.end.slotId, c.end.moduleId), c.adaptor)
    )
    
    let newConnections = [
        ...newInternalConnections,
        ...newBridgeConnectionsIn,
        ...newBridgeConnectionsOut,
        ...newExplicitConnectionsIn,
        ...newExplicitConnectionsOut
    ]

    let workflow = new Workflow({
        modules: newModules,
        connections: newConnections,
        plugins: newPlugins
    })

    let subscriptionsStore = new SubscriptionStore()
    subscriptionsStore.update([
        ...newModules,
        ...newPlugins,
        // those are needed to connect to the 'outside' of the component
        ...rootComponent.workflow.modules,
        ...rootComponent.workflow.plugins
    ], newConnections, []);

    console.log("WORKFLOW CONSTRUCTION COMPLETED " + rootComponent.configuration.title + ":" + name, { rootComponent, workflow })
    workflow.setup()

    return {rootComponent: newModules[0] as GroupModules.Module, workflow, subscriptionsStore}

}

/*
export function replicateComponentFlux(
    component: Component.Module,
    parentStorage: StaticStorage,
    idSuffix: string,
    replicaIndex: number
): Component.Module {

    let staticStorage = new StaticStorage(idSuffix, parentStorage)
    let replicaId = (id) => (idSuffix != undefined && idSuffix != "") ? `${id}_${idSuffix}` : id

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
        console.log("START WORKFLOW CONSTRUCTION " + component.configuration.title + ":" + replicaIndex, { allChildren: component.getAllChildren() })

        let modules = component.getAllChildren()
        let connections = component.getConnections()

        let newModules: Array<ModuleFlux> = modules
            .filter((mdle: ModuleFlux) =>  !(mdle instanceof PluginFlux))
            .map((mdle: ModuleFlux) => {
                let replicaMdle = new mdle.Factory.Module(
                    Object.assign(
                        {},
                        mdle,
                        { moduleId: replicaId(mdle.moduleId), workflowGetter, staticStorage }
                    )
                )
                replicaMdle['ReplicaId'] = replicaIndex
                replicaMdle['uuid'] = uuidv4()
                return replicaMdle
            })

        let newPlugins = modules
            .filter((mdle: ModuleFlux) => mdle instanceof PluginFlux)
            .map((plugin: PluginFlux<any>) => {

                let parentModule = newModules.find(mdle => mdle.moduleId == replicaId(plugin.parentModule.moduleId))
                let replicaPlugin = new plugin.Factory.Module(
                    Object.assign(
                        {},
                        plugin,
                        { moduleId: replicaId(plugin.moduleId), parentModule, staticStorage }))
                replicaPlugin['ReplicaId'] = replicaIndex
                replicaPlugin['uuid'] = uuidv4()
                if (plugin.moduleId.includes("ComponentReplica"))
                    console.log("INSTANTIATED COPY OF PLUGIN " + plugin.parentModule.configuration.title,
                        { id: replicaPlugin.moduleId, uuid: replicaPlugin['uuid'] }
                    )
                return replicaPlugin
            });

        [...newModules, ...newPlugins].filter(m => instanceOfSideEffects(m)).map(m => m.apply())

        let componentPlugins = []
        
        let newComponentPlugins = [] 
        
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
            modules: newModules,
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
        console.log("WORKFLOW CONSTRUCTION COMPLETED " + component.configuration.title + ":" + replicaIndex, { replicaId, workflow })
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
        moduleIds: component.getDirectChildren().map(m => m.moduleId).map((mdleId) => replicaId(mdleId))
    }))
    newComponent['ReplicaId'] = replicaIndex
    newComponent['uuid'] = uuidv4()
    console.log("Done replicating FLUX COMPONENT", newComponent)
    return newComponent
}



export function replicateComponentHtml(
    mdle: Component.Module, 
    layout: HTMLDivElement, 
    instanceSuffix?: string
    ) : HTMLDivElement {

    let newLayout = layout.cloneNode(true) as HTMLDivElement
    newLayout.querySelectorAll(".flux-element").forEach((item) => {
        if (!item.classList.contains("flux-component"))
            item.innerHTML = ""
        if (instanceSuffix)
            item.id += "_" + instanceSuffix
    })
    renderTemplate(newLayout, mdle.getAllChildren())
    return newLayout
}
*/

