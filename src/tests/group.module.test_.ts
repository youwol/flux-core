/** @format */

import { ModuleTest } from './test-modules'
import {
    ModuleConfiguration,
    GroupModules,
    Workflow,
    LayerTree,
    Connection,
    MockEnvironment,
} from '../index'
import { SlotRef } from '../lib/models/models-base'
import { Subject } from 'rxjs'
import { take } from 'rxjs/operators'
console.log = () => {}

const environment = new MockEnvironment()

test('empty group module test', () => {
    const configuration = new ModuleConfiguration({
        title: 'title',
        description: 'description',
        data: new ModuleTest.PersistentData(),
    })

    const layerId = 'testLayerGroup'

    const rootLayerTree = new LayerTree({
        layerId: 'root',
        title: 'root layer',
        children: [
            new LayerTree({
                layerId,
                title: 'test layer',
                children: [],
                moduleIds: [],
                html: '',
                css: '',
            }),
        ],
        moduleIds: [],
        html: '',
        css: '',
    })

    const mdle = new GroupModules.Module({
        moduleId: 'groupModule',
        configuration,
        Factory: GroupModules as any,
        environment: environment,
        workflow$: new Subject<Workflow>(),
    })
    console.log(mdle)

    expect(mdle.inputSlots).toEqual([])
    expect(mdle.outputSlots).toEqual([])
})

test('group 2 modules, no connection', () => {
    const configuration = new ModuleConfiguration({
        title: 'title',
        description: 'description',
        data: new ModuleTest.PersistentData(),
    })

    const mdles = [1, 2, 3, 4].map(
        (i) =>
            new ModuleTest.Module({
                moduleId: 'mdle' + i,
                configuration,
                Factory: ModuleTest,
                environment: {},
            }),
    )

    const layerId = 'testLayerGroup'
    const rootLayerTree = new LayerTree({
        layerId: 'root',
        title: 'root layer',
        children: [
            new LayerTree({
                layerId,
                title: 'test layer',
                children: [],
                moduleIds: ['mdle2', 'mdle3'],
                html: '',
                css: '',
            }),
        ],
        moduleIds: ['mdle1', 'mdle4'],
        html: '',
        css: '',
    })
    const workflow = new Workflow({
        modules: mdles,
        connections: [],
        plugins: [],
    })

    const workflow$ = new Subject<Workflow>()

    const mdleGroup = new GroupModules.Module({
        moduleId: 'groupModule',
        configuration,
        Factory: GroupModules as any,
        workflow$,
        environment,
    })

    workflow$.next(workflow)

    console.log(mdleGroup)

    expect(mdleGroup.inputSlots).toEqual([])
    expect(mdleGroup.outputSlots).toEqual([])
})

test('group 2 modules, 1 connection in, 1 connection out', () => {
    const configuration = new ModuleConfiguration({
        title: 'title',
        description: 'description',
        data: new ModuleTest.PersistentData(),
    })
    let workflow: Workflow = undefined
    const mdles = [1, 2, 3, 4].map(
        (i) =>
            new ModuleTest.Module({
                moduleId: 'mdle' + i,
                configuration,
                Factory: ModuleTest,
                environment: {},
            }),
    )

    const connections = [
        new Connection(
            new SlotRef('output', 'mdle1'),
            new SlotRef('input', 'mdle2'),
        ),
        new Connection(
            new SlotRef('output', 'mdle2'),
            new SlotRef('input', 'mdle3'),
        ),
        new Connection(
            new SlotRef('output', 'mdle3'),
            new SlotRef('input', 'mdle4'),
        ),
    ]
    const layerId = 'testLayerGroup'
    const rootLayerTree = new LayerTree({
        layerId: 'root',
        title: 'root layer',
        children: [
            new LayerTree({
                layerId,
                title: 'test layer',
                children: [],
                moduleIds: ['mdle2', 'mdle3'],
                html: '',
                css: '',
            }),
        ],
        moduleIds: ['mdle1', 'mdle4'],
        html: '',
        css: '',
    })

    const workflow$ = new Subject<Workflow>()

    const mdleGroup = new GroupModules.Module({
        moduleId: 'groupModule',
        configuration,
        Factory: GroupModules as any,
        environment,
        workflow$,
    })

    workflow = new Workflow({
        modules: [...mdles, mdleGroup],
        connections,
        plugins: [],
    })

    workflow$.next(workflow)

    console.log(mdleGroup)
    mdleGroup
        .getAllSlots$()
        .pipe(take(1))
        .subscribe((slots) => {
            expect(slots.inputs.implicits.length).toEqual(1)
            expect(slots.inputs.implicits[0].moduleId).toEqual('mdle2')
            expect(slots.inputs.implicits[0].slotId).toEqual('input')
            expect(slots.outputs.implicits.length).toEqual(1)
            expect(slots.outputs.implicits[0].moduleId).toEqual('mdle3')
            expect(slots.outputs.implicits[0].slotId).toEqual('output')

            const renderer = new mdleGroup.Factory.BuilderView()
            const div = renderer.render(mdleGroup)
            const inputSlots = div.querySelectorAll('.input.slot')
            const outputSlots = div.querySelectorAll('.output.slot')
            expect(inputSlots.length).toEqual(1)
            expect(outputSlots.length).toEqual(1)
        })
})
