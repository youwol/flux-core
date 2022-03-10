/** @format */

import * as operators from 'rxjs/operators'

import { ModuleTest, PluginTest } from './test-modules'
import { ModuleConfiguration, SlotRef, Connection, Adaptor } from '../index'

console.log = () => {}

test('Module', (done) => {
    const configuration = new ModuleConfiguration({
        title: 'title',
        description: 'description',
        data: new ModuleTest.PersistentData(),
    })
    const moduleId = 'toto'
    const environment = {}
    const Factory = ModuleTest
    const mdle = new ModuleTest.Module({
        moduleId,
        configuration,
        Factory,
        environment,
    })
    mdle.cache.setCapacity(2)

    expect(mdle.moduleId).toBe('toto')
    expect(mdle.inputSlots).toHaveLength(1)
    expect(mdle.outputSlots).toHaveLength(1)

    const c = new Connection(
        new SlotRef('id0', 'module0'),
        new SlotRef('id1', 'module1'),
    )

    mdle.outputSlots[0].observable$
        .pipe(operators.take(1))
        .subscribe(({ data, configuration, context }) => {
            expect(data.value).toBe(4)
            expect(context.fromCache).toBe(false)
        })
    mdle.outputSlots[0].observable$
        .pipe(operators.skip(1), operators.take(1))
        .subscribe(({ data, configuration, context }) => {
            expect(data.value).toBe(4)
            expect(context.fromCache).toBe(true)
        })
    mdle.outputSlots[0].observable$
        .pipe(operators.skip(1), operators.take(1))
        .subscribe(({ data, configuration, context }) => {
            expect(data.value).toBe(4)
            expect(context.fromCache).toBe(true)
            done()
        })

    const d = {
        connection: c,
        message: { data: { value: 2 }, configuration: {}, context: {} },
    }
    mdle.inputSlots[0].subscribeFct(d)
    mdle.inputSlots[0].subscribeFct(d)
    mdle.inputSlots[0].subscribeFct({
        connection: c,
        message: { data: { value: 2 }, configuration: {}, context: {} },
    })
})

test('Module with adaptor', (done) => {
    const configuration = new ModuleConfiguration({
        title: 'title',
        description: 'description',
        data: new ModuleTest.PersistentData(),
    })
    const environment = {}
    const Factory = ModuleTest
    const mdle = new ModuleTest.Module({ configuration, Factory, environment })

    expect(mdle.moduleId.split('-')).toHaveLength(5)

    mdle.cache.setCapacity(2)

    const code = ` 
    return ({data,configuration,context}) => ({
        data:  { value: data.value *2 },
        context:{ adapted: true },
        configuration: configuration
    })
    `
    const c = new Connection(
        new SlotRef('id0', 'module0'),
        new SlotRef('id1', 'module1'),
        new Adaptor('adapt0', code),
    )

    mdle.outputSlots[0].observable$
        .pipe(operators.take(1))
        .subscribe(({ data, configuration, context }) => {
            expect(data.value).toBe(16)
            expect(context.fromCache).toBe(false)
            done()
        })
    mdle.inputSlots[0].subscribeFct({
        connection: c,
        message: { data: { value: 2 }, configuration: {}, context: {} },
    })
})

test('Plugin test', () => {
    const configuration = new ModuleConfiguration({
        title: 'title',
        description: 'description',
        data: new PluginTest.PersistentData(),
    })
    const moduleId = 'toto'
    const environment = {}
    const Factory = PluginTest
    const parent = new ModuleTest.Module({
        moduleId,
        configuration,
        Factory,
        environment,
    })
    const plugin = new PluginTest.Module({
        parent,
        moduleId: 'pluginId',
        configuration,
        Factory,
        environment,
    })
})
