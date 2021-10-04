
import { PluginFlux, StaticStorage, ModuleFlux, Connection, SlotRef, instanceOfSideEffects } from "../models"
import { SubscriptionStore } from './subscriptions-store';
import { Workflow } from "../flux-project/core-models";
import { GroupModules } from "../modules/group.module";
import { Component } from "../modules/component.module";
import { map } from "rxjs/operators";
import { Observable } from "rxjs";


interface WorkflowFork{ 
    rootComponent: GroupModules.Module, 
    workflow: Workflow, 
    subscriptionsStore: SubscriptionStore
}

export function duplicateResolvedWorkflow({originalWorkflow, rootComponent, indexEntryPoint, name}:{
    originalWorkflow: Workflow,
    rootComponent: GroupModules.Module,
    indexEntryPoint: number
    name: string
}) : WorkflowFork {

    let replicaId = (id) => id
    let staticStorage = new StaticStorage(name, rootComponent.staticStorage)

    let modules = [rootComponent, ...rootComponent.getAllChildren(originalWorkflow)]
    let connections = rootComponent.getConnections(originalWorkflow)

    let newModules: Array<ModuleFlux> = modules
        .filter((mdle: ModuleFlux) => !(mdle instanceof PluginFlux))
        .map((mdle: ModuleFlux, i) => {
            let replicaMdle = new mdle.Factory.Module({
                ...mdle,
                moduleId: replicaId(mdle.moduleId), 
                staticStorage,
                userData: {replicaId: name}
            })
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
        ...originalWorkflow.modules,
        ...originalWorkflow.plugins
    ], newConnections, []);

    return {rootComponent: newModules[0] as GroupModules.Module, workflow, subscriptionsStore}
}


export function duplicateWorkflow$({rootComponent, indexEntryPoint, name}:{
    rootComponent: GroupModules.Module,
    indexEntryPoint: number,
    name: string
    }) : Observable<WorkflowFork> {

    return rootComponent.workflow$.pipe(
        map(workflow => {
            return duplicateResolvedWorkflow({
                originalWorkflow:workflow,
                rootComponent,
                indexEntryPoint,
                name
            })
        })
    )
}
