/** @format */

import { from, Observable, of, Subject, Subscription } from 'rxjs'
import { map, mapTo, mergeMap, reduce, tap } from 'rxjs/operators'
import { IEnvironment } from '../environment'
import {
    Adaptor,
    Connection,
    Factory,
    FluxPack,
    ModuleFlux,
    PluginFlux,
} from '../models/models-base'
import { packCore } from '../modules/factory-pack-core'
import {
    BuilderRenderingSchema,
    ConnectionSchema,
    ModuleSchema,
    PluginSchema,
    ProjectSchema,
} from './client-schemas'
import {
    BuilderRendering,
    DescriptionBox,
    ModuleView,
    Project,
    Workflow,
} from './core-models'

function getPackage(name: string) {
    if (window[name]) {
        return window[name]
    }

    console.warn(
        `The dependency ${name} has not been found, requirements needs update to include namespace in flux-packs.`,
    )

    if (window[`@youwol/${name}`]) {
        return window[`@youwol/${name}`]
    }

    throw Error(`Can not find loaded package ${name}`)
}

export function loadProjectDependencies$(
    project: ProjectSchema,
    environment: IEnvironment,
    onEvent?: (CdnEvent) => void,
): Observable<{ project: ProjectSchema; packages: Array<FluxPack> }> {
    return of(project.requirements.loadingGraph).pipe(
        mergeMap((root: any) => {
            return environment.fetchLoadingGraph(
                project.requirements.loadingGraph,
                onEvent,
            )
        }),
        tap((r) => console.log('dependencies loaded', { libraries: r })),
        mergeMap(() => {
            return from(
                project.requirements.fluxPacks.map((p) => getPackage(p)),
            )
        }),
        mergeMap((jsModule: any) => {
            const installFct = jsModule.install || jsModule.pack.install
            if (!installFct) {
                return of(jsModule)
            }
            const install = installFct(environment)
            if (install instanceof Observable) {
                return install.pipe(mapTo(jsModule))
            }

            if (install instanceof Promise) {
                return from(install).pipe(mapTo(jsModule))
            }

            return of(jsModule)
        }),
        reduce((acc, e) => acc.concat(e), []),
        map((packages) => {
            return { project, packages: [{ pack: packCore }, ...packages] }
        }),
    )
}

export function loadProject$(
    project$: Observable<ProjectSchema>,
    workflow$: Subject<Workflow>,
    subscriptionsStore: Map<Connection, any>,
    environment: IEnvironment,
    onEvent?: (CdnEvent) => void,
): Observable<{
    project: Project
    packages: Array<FluxPack>
    modulesFactory: Map<string, Factory>
}> {
    const projectData$ = project$.pipe(
        mergeMap((project: ProjectSchema) => {
            return loadProjectDependencies$(project, environment, onEvent)
        }),
        map(({ project, packages }) => {
            return createProject(
                project,
                packages,
                workflow$,
                subscriptionsStore,
                environment,
            )
        }),
    )
    return projectData$
}

export function loadProjectDatabase$(
    projectId: string,
    workflow$: Subject<Workflow>,
    subscriptionsStore: Map<Connection, Subscription>,
    environment: IEnvironment,
    onEvent?: (CdnEvent) => void,
): Observable<{
    project: Project
    packages: Array<FluxPack>
    modulesFactory: Map<string, Factory>
}> {
    return loadProject$(
        environment.getProject(projectId),
        workflow$,
        subscriptionsStore,
        environment,
        onEvent,
    )
}

export function loadProjectURI$(
    projectURI: string,
    workflow$: Subject<Workflow>,
    subscriptionsStore: Map<Connection, Subscription>,
    environment: IEnvironment,
    onEvent?: (CdnEvent) => void,
): Observable<{
    project: Project
    packages: Array<FluxPack>
    modulesFactory: Map<string, Factory>
}> {
    const project = JSON.parse(decodeURIComponent(projectURI)) as ProjectSchema
    return loadProject$(
        of(project),
        workflow$,
        subscriptionsStore,
        environment,
        onEvent,
    )
}

export function createProject(
    project: ProjectSchema,
    packs,
    workflow$: Subject<Workflow>,
    subscriptionsStore: Map<Connection, Subscription>,
    environment: IEnvironment,
): {
    project: Project
    packages: Array<FluxPack>
    modulesFactory: Map<string, Factory>
} {
    const packages = packs.map((p) => p.pack)

    packages
        .filter((p) => p.initialize)
        .forEach((p) => p.initialize(environment))

    let modulesFactory = packages.reduce(
        (acc, e) =>
            acc.concat(
                Object.values(e.modules ? e.modules : {}).map(
                    (Factory: any) => {
                        const factoryKey = JSON.stringify({
                            module: Factory['id'],
                            pack: e.name,
                        })
                        return [factoryKey, Factory]
                    },
                ),
            ),
        [],
    )

    modulesFactory = new Map(modulesFactory)
    const modules = instantiateProjectModules(
        project.workflow.modules,
        modulesFactory,
        environment,
        workflow$,
    )
    const plugins = instantiateProjectPlugins(
        project.workflow.plugins,
        modules,
        modulesFactory,
        environment,
    )
    const connections = instantiateProjectConnections(
        subscriptionsStore,
        project.workflow.connections,
        [...modules, ...plugins],
    )

    const newProject = new Project({
        ...project,
        ...{
            workflow: new Workflow({ modules, connections, plugins }),
            builderRendering: instantiateProjectBuilderRendering(
                modules,
                project.builderRendering,
            ),
        },
    })
    workflow$.next(newProject.workflow)
    return { project: newProject, packages, modulesFactory }
}

function isGroupingModule(moduleData: ModuleSchema): boolean {
    return ['GroupModules', 'Component'].includes(moduleData.factoryId.module)
}

export function instantiateProjectModules(
    modulesData: Array<ModuleSchema>,
    modulesFactory: Map<string, Factory>,
    environment: IEnvironment,
    workflow$: Observable<Workflow>,
): Array<ModuleFlux> {
    const modules = modulesData
        .map((moduleData) => {
            const factoryKey = JSON.stringify(moduleData.factoryId)
            const Factory = modulesFactory.get(factoryKey)
            if (!Factory) {
                throw Error(`Can not get factory ${factoryKey}`)
            }
            const configuration = new Factory.Configuration({
                title: moduleData.configuration.title,
                description: moduleData.configuration.description,
                data: new Factory.PersistentData(moduleData.configuration.data),
            })
            const data = {
                moduleId: moduleData.moduleId,
                configuration,
                Factory,
                environment,
                workflow$,
            }

            const mdle = new Factory.Module(data)
            return mdle
        })
        .filter((m) => m)

    return modules
}

export function instantiateProjectPlugins(
    pluginsData: Array<PluginSchema>,
    modules: Array<ModuleFlux>,
    pluginsFactory: Map<string, Factory>,
    environment: IEnvironment,
): Array<PluginFlux<ModuleFlux>> {
    const plugins = pluginsData.map((pluginData) => {
        const factoryKey = JSON.stringify(pluginData.factoryId)
        const Factory = pluginsFactory.get(factoryKey)
        if (!Factory) {
            throw Error(`Can not get factory ${factoryKey}`)
        }

        if (Factory == undefined) {
            console.error('Can not find factory ', pluginData)
        }
        const configuration = new Factory.Configuration({
            title: pluginData.configuration.title,
            description: pluginData.configuration.description,
            data: new Factory.PersistentData(pluginData.configuration.data),
        })

        const parentModule = modules.find(
            (m) => m.moduleId === pluginData.parentModuleId,
        )
        const mdle = new Factory.Module({
            parentModule: parentModule,
            moduleId: pluginData.moduleId,
            configuration,
            Factory,
            environment,
        })

        return mdle
    })

    return plugins
}

export function instantiateProjectConnections(
    allSubscriptions: Map<Connection, Subscription>,
    connectionsData: Array<ConnectionSchema>,
    modules: Array<ModuleFlux>,
): Array<Connection> {
    Array.from(allSubscriptions.values()).forEach((value: any) =>
        value.unsubscribe(),
    )

    allSubscriptions.clear()

    const connections = connectionsData
        .map((connection) => {
            const moduleIn = modules.filter(
                (m) => m.moduleId === connection.end.moduleId,
            )[0]
            const moduleOut = modules.filter(
                (m) => m.moduleId === connection.start.moduleId,
            )[0]
            if (!moduleIn) {
                console.error(
                    'can not find module with id ' + connection.end.moduleId,
                )
                return undefined
            }
            if (!moduleOut) {
                console.error(
                    'can not find module with id ' + connection.start.moduleId,
                )
                return undefined
            }
            const slotOutput = moduleOut.outputSlots.find(
                (c) => c.slotId === connection.start.slotId,
            )
            const slotInput = moduleIn.inputSlots.find(
                (c) => c.slotId === connection.end.slotId,
            )
            if (!slotOutput) {
                console.error(
                    'can not find output slot ' + connection.start.slotId,
                )
                return undefined
            }
            if (!slotInput) {
                console.error(
                    'can not find input slot ' + connection.end.slotId,
                )
                return undefined
            }
            if (!connection.adaptor) {
                return new Connection(slotOutput, slotInput)
            }

            const adaptor = new Adaptor(
                connection.adaptor.adaptorId,
                connection.adaptor.mappingFunction,
            )
            return new Connection(slotOutput, slotInput, adaptor)
        })
        .filter((c) => c)

    return connections
}

export function instantiateProjectBuilderRendering(
    modulesData: Array<ModuleFlux>,
    rendererData: BuilderRenderingSchema,
): BuilderRendering {
    const modulesViewData = rendererData.modulesView
    const connectionsViewData = rendererData.connectionsView || []

    const modulesView = modulesViewData.map((moduleView: ModuleView) => {
        const moduleData = modulesData.find(
            (m) => moduleView.moduleId == m.moduleId,
        )
        return new ModuleView(
            moduleView.moduleId,
            moduleView.xWorld,
            moduleView.yWorld,
            moduleData.Factory,
        )
    })

    const connectionsView = connectionsViewData.map((c: any) => c)

    const descriptionBoxes = rendererData.descriptionsBoxes.map(
        (b) =>
            new DescriptionBox(
                b.descriptionBoxId,
                b.title,
                b.modulesId,
                b.descriptionHtml,
                b.properties,
            ),
    )
    return new BuilderRendering(modulesView, connectionsView, descriptionBoxes)
}
