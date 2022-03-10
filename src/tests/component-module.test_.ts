/** @format */

import {
    Cache,
    Component,
    Connection,
    Graph,
    instantiateModules,
    LayerTree,
    parseGraph,
    renderTemplate,
    Runner,
    SlotRef,
} from '../index'
import { Context } from '../lib/models/context'
import { Label, ModuleTest } from './test-modules'

test('simple component with label display', (done) => {
    const branches = [
        '=== group component =====',
        '|~module0~|----|~module1~|---|~label~|---|~module3~|',
        '=========================',
    ]
    let graph: Graph = undefined
    const modules = instantiateModules({
        module0: ModuleTest,
        module1: ModuleTest,
        label: Label,
        module3: ModuleTest,
        component: [
            Component,
            {
                workflowGetter: (_) => graph.workflow,
                layerId: 'componentLayer',
                explicitInputsCount: 1,
            },
        ],
    })
    const withConnections = [
        new Connection(
            new SlotRef(`explicitInput0_in`, 'component'),
            modules.module1.inputSlots[0],
        ),
    ]
    const layerTree = new LayerTree({
        layerId: 'root',
        title: 'root layer',
        children: [
            new LayerTree({
                layerId: 'componentLayer',
                title: 'component',
                children: [],
                moduleIds: ['module1', 'label'],
                html: "<div id='component'><label> result: </label><div id='label'></div></div>",
                css: '',
            }),
        ],
        moduleIds: ['module0', 'module3'],
        html: '',
        css: '',
    })
    graph = parseGraph({ branches, modules, withConnections, layerTree })

    new Runner(graph)
    const div = document.createElement('div')
    div.innerHTML = "<div id='template'><div id='component'></div></div>"

    renderTemplate(div, graph.workflow.modules)
    const context = new Context('module0 execution', {}, undefined)
    modules.module0.square(
        { data: { value: 1 }, configuration: {}, context },
        { cache: new Cache() },
    )
    const promise1 = new Promise((resolve, reject) => {
        setTimeout(() => {
            resolve(div)
        }, 300)
    })

    promise1.then((div: HTMLDivElement) => {
        const templateDiv = div.querySelector('#template')
        expect(templateDiv.children.length).toEqual(1)
        const componentDiv = div.querySelector('#component')
        expect(componentDiv).toBeDefined()
        expect(componentDiv.innerHTML).toEqual(
            '<label> result: </label><div id="label" class="flux-element"><div><label>1</label></div></div>',
        )
        const label = componentDiv.querySelector('#label label')
        expect(label.innerHTML).toEqual('1')
        done()
    })
})
