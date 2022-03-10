/** @format */

import { ModuleFlux, Pipe, genericModulePlot, freeContract } from '../index'
import { MockEnvironment } from '../lib/environment'

console.log = () => {}

export class Input {}

export class Output {}

export class Module extends ModuleFlux {
    readonly output$: Pipe<Output>

    constructor(params) {
        super(params)

        this.addInput({
            id: 'input',
            description: '',
            contract: freeContract(),
            onTriggered: undefined,
        })

        this.output$ = this.addOutput({ id: 'output' })
    }
}

test('modulePlot', () => {
    const moduleId = 'toto'
    const mdle = new Module({
        moduleId,
        configuration: { title: 'title' },
        Factory: undefined,
        environment: new MockEnvironment(),
    })

    const p = genericModulePlot({
        module: mdle,
        icon: '',
        width: 100,
        vMargin: 10,
        vStep: 10,
    })

    let plugs = p.querySelectorAll('.plug')
    expect(plugs).toHaveLength(2)

    plugs = p.querySelectorAll('.plug.input')
    expect(plugs).toHaveLength(1)

    plugs = p.querySelectorAll('.plug.output')
    expect(plugs).toHaveLength(1)

    let slots = p.querySelectorAll('.slot')
    expect(slots).toHaveLength(2)

    slots = p.querySelectorAll('.slot.input')
    expect(slots).toHaveLength(1)

    slots = p.querySelectorAll('.slot.output')
    expect(slots).toHaveLength(1)

    expect(p.querySelectorAll('rect.module.content')).toHaveLength(1)
    expect(p.querySelectorAll('.module.header.title')).toHaveLength(1)
})

export class Module2 extends ModuleFlux {
    readonly output0$: Pipe<Output>
    readonly output1$: Pipe<Output>

    constructor(params) {
        super(params)

        this.addInput({
            id: 'input0',
            description: '',
            contract: freeContract(),
            onTriggered: undefined,
        })
        this.addInput({
            id: 'input1',
            description: '',
            contract: freeContract(),
            onTriggered: undefined,
        })
        this.addInput({
            id: 'input2',
            description: '',
            contract: freeContract(),
            onTriggered: undefined,
        })

        this.output0$ = this.addOutput({ id: 'output0' })
        this.output1$ = this.addOutput({ id: 'output1' })
    }
}

test('modulePlot 2', () => {
    const moduleId = 'toto'
    const mdle = new Module2({
        moduleId,
        configuration: { title: 'title' },
        Factory: undefined,
        environment: new MockEnvironment(),
    })

    const p = genericModulePlot({
        module: mdle,
        icon: '',
        width: 100,
        vMargin: 10,
        vStep: 10,
    })

    let plugs = p.querySelectorAll('.plug')
    expect(plugs).toHaveLength(5)

    plugs = p.querySelectorAll('.plug.input')
    expect(plugs).toHaveLength(3)

    plugs = p.querySelectorAll('.plug.output')
    expect(plugs).toHaveLength(2)
})
