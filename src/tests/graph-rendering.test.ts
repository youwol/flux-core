/** @format */

import * as rxjs from 'rxjs'
import * as operators from 'rxjs/operators'
import {
    instantiateModules,
    parseGraph,
    Runner,
    renderTemplate,
} from '../index'
import { DropDown, Console } from './test-modules'

test('static rendering working', () => {
    const branches = ['|~dropDown~|--$obs$---=a|~console~|']

    const confItems = [
        { text: 'option 1', value: { n: 0 } },
        { text: 'option 2', value: { n: 1 } },
    ]

    const modules = instantiateModules({
        dropDown: [DropDown, { items: confItems }],
        console: Console,
    })
    const observers = {
        obs: new rxjs.Subject(),
    }
    const adaptors = {
        a: ({ data, context, config }) => ({ data, context, config }),
    }
    const graph = parseGraph({ branches, modules, adaptors, observers })

    new Runner(graph)
    // let div = new Renderer(runner, `<div id='dropDown'> <div>`,"").render()

    const div = document.createElement('div')
    div.innerHTML = "`<div id='dropDown' class='flux-element'> <div>`"
    renderTemplate(div, graph.workflow.modules)

    const options = div.querySelectorAll('option')
    expect(options).toHaveLength(2)
    expect(options[0].innerHTML).toBe('option 1')
    expect(options[1].innerHTML).toBe('option 2')
})

test('dynamic interaction working', (done) => {
    const branches = ['|~dropDown~|--$obs$---=a|~console~|']

    const confItems = [
        { text: 'option 1', value: { n: 0 } },
        { text: 'option 2', value: { n: 1 } },
    ]

    const modules = instantiateModules({
        dropDown: [DropDown, { items: confItems }],
        console: Console,
    })
    const observers = {
        obs: new rxjs.Subject(),
    }
    observers.obs.pipe(operators.take(1)).subscribe((v: any) => {
        expect(v.n).toBe(0)
    })
    observers.obs
        .pipe(operators.skip(1), operators.take(1))
        .subscribe((v: any) => {
            expect(v.n).toBe(1)
            done()
        })

    const adaptors = {
        a: ({ data, context, config }) => ({ data, context, config }),
    }
    const graph = parseGraph({ branches, modules, adaptors, observers })

    new Runner(graph)

    const div = document.createElement('div')
    div.innerHTML = "`<div id='dropDown' class='flux-element'> <div>`"
    renderTemplate(div, graph.workflow.modules)

    const select = div.querySelector('select')
    select.selectedIndex = 1
    select.dispatchEvent(new Event('change'))
})
