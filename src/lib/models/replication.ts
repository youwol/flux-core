/** @format */

import { Observable, ReplaySubject, Subject } from 'rxjs'
import { map } from 'rxjs/operators'
import { Workflow } from '../flux-project/core-models'
import {
    Connection,
    instanceOfSideEffects,
    ModuleFlux,
    PluginFlux,
    SlotRef,
    StaticStorage,
} from '../models'
import { GroupModules } from '../modules/group.module'
import { SubscriptionStore } from './subscriptions-store'

interface WorkflowFork {
    rootComponent: GroupModules.Module
    workflow: Workflow
    subscriptionsStore: SubscriptionStore
    workflow$: Subject<Workflow>
}

export function duplicateResolvedWorkflow({
    originalWorkflow,
    rootComponent,
    indexEntryPoint,
    name,
}: {
    originalWorkflow: Workflow
    rootComponent: GroupModules.Module
    indexEntryPoint: number
    name: string
}): WorkflowFork {
    const workflow$ = new ReplaySubject<Workflow>(1)
    const replicaId = (id) => id
    const staticStorage = new StaticStorage(name, rootComponent.staticStorage)

    const modules = [
        rootComponent,
        ...rootComponent.getAllChildren(originalWorkflow),
    ]
    const connections = rootComponent.getConnections(originalWorkflow)

    const newModules: Array<ModuleFlux> = modules
        .filter((mdle: ModuleFlux) => !(mdle instanceof PluginFlux))
        .map((mdle: ModuleFlux, i) => {
            const replicaMdle = new mdle.Factory.Module({
                ...mdle,
                moduleId: replicaId(mdle.moduleId),
                staticStorage,
                workflow$,
                userData: { replicaId: name },
            })
            return replicaMdle
        })

    const newPlugins = modules
        // we do not include the plugins of the root component: they are considered 'outside'
        // not really sure about it
        .filter(
            (mdle: ModuleFlux) =>
                mdle instanceof PluginFlux &&
                mdle.parentModule != rootComponent,
        )
        .map((plugin: PluginFlux<any>) => {
            const parentModule = newModules.find(
                (mdle) =>
                    mdle.moduleId == replicaId(plugin.parentModule.moduleId),
            )
            const replicaPlugin = new plugin.Factory.Module({
                ...plugin,
                moduleId: replicaId(plugin.moduleId),
                parentModule,
                staticStorage,
                userData: { replicaId: name },
            })

            return replicaPlugin
        })

    ;[...newModules, ...newPlugins]
        .filter((m) => instanceOfSideEffects(m))
        .map((m) => m.apply())

    const newInternalConnections = connections.internals.map(
        (c: Connection) =>
            new Connection(
                new SlotRef(c.start.slotId, replicaId(c.start.moduleId)),
                new SlotRef(c.end.slotId, replicaId(c.end.moduleId)),
                c.adaptor,
            ),
    )
    const newBridgeConnectionsIn = connections.implicits.inputs.map(
        (c: Connection) =>
            new Connection(
                new SlotRef(c.start.slotId, c.start.moduleId),
                new SlotRef(c.end.slotId, replicaId(c.end.moduleId)),
                c.adaptor,
            ),
    )
    const newBridgeConnectionsOut = connections.implicits.outputs.map(
        (c: Connection) =>
            new Connection(
                new SlotRef(c.start.slotId, replicaId(c.start.moduleId)),
                new SlotRef(c.end.slotId, c.end.moduleId),
                c.adaptor,
            ),
    )
    const newExplicitConnectionsIn = connections.explicits.inputs
        // we should not add the connection that is connected to the entry point
        .filter((c: Connection) => {
            if (
                c.end.moduleId == rootComponent.moduleId &&
                c.end.slotId == `explicitInput${indexEntryPoint}`
            ) {
                return false
            }
            return true
        })
        .map((c: Connection) => {
            return new Connection(
                new SlotRef(c.start.slotId, c.start.moduleId),
                new SlotRef(c.end.slotId, replicaId(c.end.moduleId)),
                c.adaptor,
            )
        })
    const newExplicitConnectionsOut = connections.explicits.outputs.map(
        (c: Connection) =>
            new Connection(
                new SlotRef(c.start.slotId, replicaId(c.start.moduleId)),
                new SlotRef(c.end.slotId, c.end.moduleId),
                c.adaptor,
            ),
    )

    const newConnections = [
        ...newInternalConnections,
        ...newBridgeConnectionsIn,
        ...newBridgeConnectionsOut,
        ...newExplicitConnectionsIn,
        ...newExplicitConnectionsOut,
    ]

    const workflow = new Workflow({
        modules: newModules,
        connections: newConnections,
        plugins: newPlugins,
    })

    const subscriptionsStore = new SubscriptionStore()
    subscriptionsStore.update(
        [
            ...newModules,
            ...newPlugins,
            // those are needed to connect to the 'outside' of the component
            ...originalWorkflow.modules,
            ...originalWorkflow.plugins,
        ],
        newConnections,
        [],
    )

    workflow$.next(workflow)
    return {
        rootComponent: newModules[0] as GroupModules.Module,
        workflow,
        subscriptionsStore,
        workflow$,
    }
}

export function duplicateWorkflow$({
    rootComponent,
    indexEntryPoint,
    name,
}: {
    rootComponent: GroupModules.Module
    indexEntryPoint: number
    name: string
}): Observable<WorkflowFork> {
    return rootComponent.workflowDistinct$.pipe(
        map((workflow) => {
            return duplicateResolvedWorkflow({
                originalWorkflow: workflow,
                rootComponent,
                indexEntryPoint,
                name,
            })
        }),
    )
}
