/** @format */

import { IEnvironment, MockEnvironment } from '../environment'
import { LayerTree } from '../flux-project/core-models'
import {
    Connection,
    Factory,
    ModuleFlux,
    PluginFlux,
} from '../models/models-base'
import { Branch, Step } from './branch'
import { Graph } from './graph'

type Namespace = any
type Config = any

export function retrieveData<T>(
    data: Array<any>,
    testers: Array<(d) => boolean>,
): T {
    const results = []
    testers.forEach((tester, i) => {
        const d = data.find((d, i) => !results.includes(d) && tester(d))
        results.push(d)
    })
    return results as unknown as T
}

function instantiateModule(
    moduleId: string,
    args: Factory | [Factory, { [key: string]: any }],
    commonMdleArgs: { environment?: IEnvironment },
): ModuleFlux {
    let Factory = undefined
    let configuration = undefined

    if (!Array.isArray(args)) {
        Factory = args
        configuration = new Factory.Configuration()
    }
    const additionalData = commonMdleArgs
    if (Array.isArray(args) && args.length && args.length == 2) {
        Factory = args[0]
        const configuration_default = new Factory.Configuration()
        const data = Object.assign(configuration_default.data, args[1])
        configuration = new Factory.Configuration({
            data: new Factory.PersistentData(data),
        })
        // Hack to store additional args in case of GroupModules
        if (data.workflowGetter) {
            additionalData['workflowGetter'] = data.workflowGetter
            additionalData['layerId'] = data.layerId
        }
    }
    if (!Factory) {
        throw Error(`can not get the factory for ${moduleId}, ${args}`)
    }

    const mdle = new Factory.Module(
        Object.assign({}, { moduleId, configuration, Factory }, additionalData),
    )
    return mdle
}

function instantiatePlugin(
    moduleId: string,
    args,
    commonMdleArgs: { environment?: IEnvironment } = {},
): PluginFlux<ModuleFlux> {
    if (args.length == undefined) {
        throw Error('Parent module is needed to instantiate a plugin')
    }

    const [factory, parentModule, configData] = retrieveData<
        [Factory, ModuleFlux, Object]
    >(args, [(d) => d.Module, (d) => d instanceof ModuleFlux, () => true])
    const configuration = new factory.Configuration({
        data: new factory.PersistentData(configData || {}),
    })

    const mdleArguments = Object.assign(
        {},
        { moduleId, configuration, Factory: factory, parentModule },
        commonMdleArgs,
    )

    const plugin = new factory.Module(mdleArguments)
    if (factory.compatibility) {
        Object.entries(factory.compatibility).forEach(
            ([description, testFct]: [string, any]) => {
                if (!testFct(parentModule)) {
                    throw Error(
                        `Plugin ${plugin.moduleId} not compatible with parent ${parentModule.moduleId}`,
                    )
                }
            },
        )
    }
    return plugin
}

function instantiate(
    entities,
    createFct,
    commonMdleArgs: { environment?: IEnvironment } = {},
) {
    if (!commonMdleArgs.environment) {
        commonMdleArgs.environment = new MockEnvironment()
    }

    const modules = Object.entries(entities).map(
        ([moduleId, args]: [string, Namespace | [Namespace, Config]]) =>
            createFct(moduleId, args, commonMdleArgs),
    )
    return modules.reduce((acc, e) => {
        acc[e.moduleId] = e
        return acc
    }, {})
}

export function instantiateModules(
    modulesInputs: Object,
    mdleArgs: { environment?: IEnvironment } = {},
) {
    return instantiate(modulesInputs, instantiateModule, mdleArgs)
}

export function instantiatePlugins(
    pluginsInputs: Object,
    mdleArgs: { environment?: IEnvironment } = {},
) {
    return instantiate(pluginsInputs, instantiatePlugin, mdleArgs)
}

/* Return the list of observers in the connection
 *  Observers are in a connection like: '----=>$observerId$---'
 *  For now only 0 or 1 observer supported
 */
function extractObserver(connectionStr: string, observersDict: any) {
    const hasObserver = connectionStr.includes('$')
    if (!hasObserver) {
        return []
    }
    const startIndex = connectionStr.indexOf('$') + 1
    const endIndex = connectionStr.indexOf('$', startIndex)
    if (!endIndex) {
        throw `Found the start of an obeserver definition, but not the end: '${connectionStr}'`
    }

    const obsName = connectionStr.substr(startIndex, endIndex - startIndex)
    const observer = observersDict[obsName]
    if (!observer) {
        throw `The observe '${obsName}' has not been provided`
    }
    return [observer]
}

/* Eventually extract an adaptor from the connection
 *  Adapator are at the end of a connection like: '----=adapatorId|~...'
 */
function extractAdaptor(connectionStr: string, adaptorDict: any) {
    const i = connectionStr.indexOf('=')
    if (i == -1) {
        return undefined
    }
    const adaptId = connectionStr.substring(i + 1)
    return adaptorDict[adaptId]
}

/* Extract module & connection's slots
 *
 * Most modules are in the forms:
 *       - in general, connecting through specific input and output slot id: '--------|slotId0~moduleId~slotId1|---------'
 *       - one can provide index of the slot instead of id using '#' : '--------|#1~moduleId~#0|---------'
 *       - if one omit top rovide slot id or index, the slot index 0 is taken
 *
 * For HTML module:
 *       - '------<moduleId/>----
 *
 */
function extractModule(moduleStr: string) {
    if (moduleStr.includes('<') && moduleStr.includes('/>')) {
        return {
            name: moduleStr.substring(
                moduleStr.indexOf('<') + 1,
                moduleStr.lastIndexOf('/'),
            ),
            isHtml: true,
            inputSlotIndex: 0,
            outputSlotIndex: undefined,
        }
    }
    const inputSlotStr = moduleStr.substring(0, moduleStr.indexOf('~'))
    const outputSlotStr = moduleStr.substring(moduleStr.lastIndexOf('~'))
    return {
        name: moduleStr.substring(
            moduleStr.indexOf('~') + 1,
            moduleStr.lastIndexOf('~'),
        ),
        isHtml: false,
        inputSlotIndex:
            inputSlotStr.indexOf('#') == -1
                ? 0
                : parseInt(
                      inputSlotStr.substring(
                          moduleStr.indexOf('#') + 1,
                          moduleStr.indexOf('~'),
                      ),
                  ),
        outputSlotIndex:
            outputSlotStr.indexOf('#') == -1
                ? 0
                : parseInt(
                      outputSlotStr.substring(
                          moduleStr.indexOf('#') + 1,
                          moduleStr.indexOf('~'),
                      ),
                  ),
    }
}

function splitElements(branchStr) {
    const positions = []
    let position = branchStr.indexOf('|')
    if (position == -1) {
        return {
            modulesStr: [],
            connectionsStr: [],
        }
    }

    positions.push(position)

    while (position !== -1) {
        position = branchStr.indexOf('|', position + 1)
        if (position != -1) {
            positions.push(position)
        }
    }
    const elements = positions
        .slice(0, -1)
        .map((p, i, self) => branchStr.substring(p + 1, self[i + 1]))
    const modules = elements.filter((_, i) => i % 2 === 0)
    const connections = elements.filter((_, i) => i % 2 !== 0)
    const lastMdleStr = modules.slice(-1)[0]
    connections.push(lastMdleStr.substring(lastMdleStr.indexOf('|') + 1))
    return {
        modulesStr: modules,
        connectionsStr: connections,
    }
}
function parseBranch({
    branch,
    modules,
    adaptors,
    observers,
}: {
    branch: string
    modules: Object
    adaptors: Object
    observers: Object
}) {
    const { modulesStr, connectionsStr } = splitElements(branch)

    const parsedObservers = connectionsStr.map((connectionStr) =>
        extractObserver(connectionStr, observers),
    )
    const parseAdaptors = connectionsStr.map((connectionStr) =>
        extractAdaptor(connectionStr, adaptors),
    )
    const parsedModules = modulesStr.map((moduleStr) =>
        extractModule(moduleStr),
    )

    const entities = parsedModules.map((mdl, i) => {
        const moduleInstance =
            /*mdl.isHtml ? instantiateHtmlStyler(mdl.name) :*/ modules[mdl.name]
        if (moduleInstance == undefined) {
            console.error(
                `Module ${mdl.name} is not found in provided modules`,
                { name: mdl.name, modules },
            )
            throw Error(`Module ${mdl.name} is not found in provided modules`)
        }
        const adaptor = i > 0 ? parseAdaptors[i - 1] : undefined
        const inputSlot = moduleInstance.inputSlots[mdl.inputSlotIndex]
        const outputSlot = moduleInstance.outputSlots[mdl.outputSlotIndex]

        return new Step(
            moduleInstance,
            inputSlot,
            outputSlot,
            adaptor ? { mappingFunction: adaptor } : undefined,
            outputSlot
                ? { from: outputSlot.observable$, to: parsedObservers[i] }
                : undefined,
        )
    })
    return new Branch(...entities)
}

export function parseGraph({
    branches,
    modules,
    plugins,
    adaptors,
    observers,
    withConnections,
    layerTree,
}: {
    branches: Array<string>
    modules: Object
    withConnections?: Array<Connection>
    plugins?: Object
    adaptors?: Object
    observers?: Object
    layerTree?: LayerTree
}) {
    const all = Object.assign({}, modules, plugins || {})
    Object.entries(all).forEach(([name, mdle]) => {
        if (!(mdle instanceof ModuleFlux)) {
            console.error(
                'flux-lib-graph-helper=>parseGraph: !(mdle instanceof ModuleFlux)',
                mdle,
            )
            throw Error(
                `Module ${name} is not instantiated , 'flux-lib-graph-helper.instantiateModules' can help`,
            )
        }
    })
    return new Graph(
        branches.map((branch) =>
            parseBranch({
                branch,
                modules: all,
                adaptors: adaptors || {},
                observers: observers || {},
            }),
        ),
        Object.values(all),
        withConnections,
    )
}
