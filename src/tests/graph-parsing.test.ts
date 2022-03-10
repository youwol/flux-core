/** @format */

import * as rxjs from 'rxjs'
import { instantiateModules, parseGraph } from '../index'
import { DropDown, Console } from './test-modules'

test('instantiate module default', () => {
    const modules = instantiateModules({ dropDown: DropDown })
    expect(modules.dropDown.Factory).toBeDefined()
    expect(modules.dropDown.moduleId).toBe('dropDown')
    expect(modules.dropDown.inputSlots).toHaveLength(0)
    expect(modules.dropDown.outputSlots).toHaveLength(1)
    expect(modules.dropDown.configuration.data.items).toEqual(
        DropDown.defaultConfigItems,
    )
})

test('instantiate module with conf', () => {
    const confItems = [{ text: 'option 1', value: { n: 0 } }]
    const modules = instantiateModules({
        dropDown: [DropDown, { items: confItems }],
    })
    expect(modules.dropDown.configuration.data.items).toEqual(confItems)
    expect(modules.dropDown.configuration.data.selectedIndex).toBe(0)
})

test('instantiate graph with one module', () => {
    const branches = ['|~dropDown~|']
    const modules = instantiateModules({
        dropDown: DropDown,
    })
    const observers = {}
    const adaptors = {}
    const graph = parseGraph({ branches, modules, adaptors, observers })

    expect(graph.workflow.modules).toHaveLength(1)
    expect(graph.workflow.connections).toHaveLength(0)
})

test('instantiate graph with one branche', () => {
    const branches = ['|~dropDown~|-----|~console~|']
    const modules = instantiateModules({
        dropDown: DropDown,
        console: Console,
    })
    const observers = {}
    const adaptors = {}
    const graph = parseGraph({ branches, modules, adaptors, observers })

    expect(graph.workflow.modules).toHaveLength(2)
    expect(graph.workflow.connections).toHaveLength(1)
    expect(graph.workflow.connections[0].start.moduleId).toBe('dropDown')
    expect(graph.workflow.connections[0].end.moduleId).toBe('console')
})

test('instantiate graph with one branche and adaptor', () => {
    const branches = ['|~dropDown~|-----=a|~console~|']
    const modules = instantiateModules({
        dropDown: DropDown,
        console: Console,
    })
    const observers = {}
    const adaptors = {
        a: ({ data, context, config }) => ({ data, context, config }),
    }
    const graph = parseGraph({ branches, modules, adaptors, observers })

    expect(graph.workflow.modules).toHaveLength(2)
    expect(graph.workflow.connections).toHaveLength(1)
    expect(graph.workflow.connections[0].start.moduleId).toBe('dropDown')
    expect(graph.workflow.connections[0].end.moduleId).toBe('console')
    expect(graph.workflow.connections[0].adaptor).toBeDefined()
})

test('instantiate graph with one branche, adaptor and observer', () => {
    const branches = ['|~dropDown~|--$obs$---=a|~console~|']
    const modules = instantiateModules({
        dropDown: DropDown,
        console: Console,
    })
    const observers = {
        obs: new rxjs.Subject(),
    }
    const adaptors = {
        a: ({ data, context, config }) => ({ data, context, config }),
    }
    const graph = parseGraph({ branches, modules, adaptors, observers })

    expect(graph.workflow.modules).toHaveLength(2)
    expect(graph.workflow.connections).toHaveLength(1)
    expect(graph.workflow.connections[0].start.moduleId).toBe('dropDown')
    expect(graph.workflow.connections[0].end.moduleId).toBe('console')
    expect(graph.workflow.connections[0].adaptor).toBeDefined()
    expect(graph.observers).toHaveLength(1)
    expect(graph.observers[0].from).toBeDefined()
    expect(graph.observers[0].to).toBeDefined()
})
