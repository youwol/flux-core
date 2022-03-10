/** @format */

import { BuilderView, Flux, Property, RenderView, Schema } from '../index'
import { FluxPack, ModuleFlux } from '../lib/models/models-base'

console.log = () => {}

const pack = new FluxPack({
    name: 'my-pack',
    description: '',
    version: '0.0.0',
})

@Schema({
    pack: pack,
    description: 'A simple properties class',
})
export class PropertiesClass {
    @Property({ description: 'a string property' })
    readonly strProp: string

    @Property({ description: 'a number property', type: 'float', default: 0 })
    readonly numberProp: number
}

export namespace MyModule {
    export class PersistentData extends PropertiesClass {
        constructor() {
            super()
        }
    }

    @Flux({
        pack: pack,
        namespace: MyModule,
        id: 'MyModule',
        displayName: 'My Module',
        description: 'A Module',
    })
    @BuilderView({
        namespace: MyModule,
        icon: "<g id='mymodule-svg-icon' ></g>",
    })
    @RenderView({
        namespace: MyModule,
        render: (mdle) => {
            const r = document.createElement('div')
            r.id = mdle.moduleId
            return r
        },
    })
    export class Module extends ModuleFlux {
        constructor(params) {
            super(params)
        }
    }
}

//-----------------------------------------------------------------------------
//-----------------------------------------------------------------------------

test('MyModule', () => {
    const factory = pack.getFactory('MyModule')
    expect(factory).toBeDefined()

    expect(factory.displayName).toBe('My Module')
    expect(factory.id).toBe('MyModule')
    expect(factory.isPlugIn).toBe(false)
    expect(factory.packId).toBe('my-pack')
    expect(factory.uid).toBe('MyModule@my-pack')

    expect(factory.PersistentData).toBeDefined()
    expect(factory.Module).toBeDefined()
    expect(factory.RenderView).toBeDefined()
    expect(factory.BuilderView).toBeDefined()
    expect(factory.Configuration).toBeDefined()

    const configuration = new factory.Configuration()
    const confData = new factory.PersistentData()
    expect(confData).toBeDefined()
    const builderView = new factory.BuilderView()
    expect(builderView.icon).toBeDefined()
    expect(builderView.render).toBeDefined()
    const icon = builderView.icon()

    expect(icon.content.includes('mymodule-svg-icon')).toBeTruthy()
    expect(icon.transforms).toBeDefined()

    const moduleId = 'toto'
    const environment = {}
    const mdle = new factory.Module({
        moduleId,
        configuration,
        MyModule,
        environment,
    })

    expect(mdle).toBeDefined()
    const renderView = new factory.RenderView(mdle)
    expect(renderView.render).toBeDefined()

    const rendered = renderView.render()
    expect(rendered.nodeName).toBe('DIV')
    expect(rendered.id).toBe('toto')
})

//-----------------------------------------------------------------------------
//-----------------------------------------------------------------------------

export namespace MyModule2 {
    export class PersistentData extends PropertiesClass {
        constructor() {
            super()
        }
    }

    @Flux({
        pack: pack,
        namespace: MyModule2,
        id: 'MyModule2',
        displayName: 'My Module2',
        description: 'A Module2',
    })
    @RenderView({
        namespace: MyModule2,
        render: (mdle) => `<div id='${mdle.moduleId}' ></div>`,
    })
    export class Module extends ModuleFlux {
        constructor(params) {
            super(params)
        }
    }
}

test('MyModule2', () => {
    const factory = pack.getFactory('MyModule2')
    expect(factory).toBeDefined()

    const moduleId = 'tutu'
    const environment = {}
    const configuration = new factory.Configuration()
    const mdle = new factory.Module({
        moduleId,
        configuration,
        MyModule,
        environment,
    })

    const renderView = new factory.RenderView(mdle)

    const rendered = renderView.render()
    expect(rendered.nodeName).toBe('DIV')
    expect(rendered.firstChild.id).toBe('tutu')
})

//-----------------------------------------------------------------------------
//-----------------------------------------------------------------------------

export namespace MyModule3 {
    export class PersistentData extends PropertiesClass {
        constructor() {
            super()
        }
    }

    @Flux({
        pack: pack,
        namespace: MyModule3,
        id: 'MyModule3',
        displayName: 'My Module3',
        description: 'A Module3',
    })
    @BuilderView({
        namespace: MyModule3,
        icon: "<g id='mymodule-svg-icon' ></g>",
        render: (mdle) => {
            const r = document.createElementNS(
                'http://www.w3.org/2000/svg',
                'rect',
            )
            r.id = mdle.moduleId
            return r
        },
    })
    export class Module extends ModuleFlux {
        constructor(params) {
            super(params)
        }
    }
}

test('MyModule3', () => {
    const factory = pack.getFactory('MyModule3')
    expect(factory).toBeDefined()

    const moduleId = 'titi'
    const environment = {}
    const configuration = new factory.Configuration()
    const mdle = new factory.Module({
        moduleId,
        configuration,
        MyModule,
        environment,
    })

    const builderView = new factory.BuilderView()

    const rendered = builderView.render(mdle)
    expect(rendered.nodeName).toBe('rect')
    expect(rendered.id).toBe('titi')
})
