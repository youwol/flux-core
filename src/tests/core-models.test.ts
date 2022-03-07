/** @format */

import {
    BuilderRendering,
    Description,
    DescriptionBox,
    DescriptionBoxProperties,
    LayerTree,
    ModuleView,
    Package,
    PackageLink,
    Project,
    Requirements,
    RunnerRendering,
    Workflow,
} from '../lib/flux-project/core-models'

console.log = () => {}

test('models init', () => {
    const pack = new Package('id', 'description', [1], [2], [3])
    expect(pack.id).toBe('id')
    expect(pack.description).toBe('description')
    expect(pack.modules).toEqual([1])
    expect(pack.plugins).toEqual([2])
    expect(pack.requirements).toEqual([3])

    const moduleView = new ModuleView('id', 0, 0, {})
    expect(moduleView.moduleId).toBe('id')
    expect(moduleView.xWorld).toBe(0)
    expect(moduleView.yWorld).toBe(0)
    expect(moduleView.Factory).toEqual({})

    const dBoxProps = new DescriptionBoxProperties('red')
    expect(dBoxProps.color).toBe('red')

    const dBox = new DescriptionBox('dboxid', 'title', [], '', dBoxProps)
    expect(dBox.descriptionBoxId).toBe('dboxid')
    expect(dBox.title).toBe('title')
    expect(dBox.modulesId).toEqual([])
    expect(dBox.descriptionHtml).toBe('')
    expect(dBox.properties).toEqual(dBoxProps)

    const builderRendering = new BuilderRendering([moduleView], [], [dBox])
    expect(builderRendering.modulesView).toEqual([moduleView])
    expect(builderRendering.descriptionsBoxes).toEqual([dBox])
    expect(builderRendering.connectionsView).toEqual([])

    const runnerRendering = new RunnerRendering('layout', 'style')
    expect(runnerRendering.layout).toBe('layout')
    expect(runnerRendering.style).toBe('style')

    const packageLink = new PackageLink('pId', '0.0.1')
    expect(packageLink.id).toBe('pId')
    expect(packageLink.version).toBe('0.0.1')

    const fluxComponents = ['Component_ee324ab6-b840-45b8-92bc-fecec00eaddd']
    const fluxPacks = [
        'flux-pack-youwol',
        'flux-pack-utility-std',
        'flux-pack-widgets-std',
        'flux-pack-flows-std',
    ]
    const libraries = {
        '@youwol/flux-pack-youwol': '0.0.0-next',
        '@youwol/flux-pack-utility-std': '1.0.5-next',
        '@youwol/flux-pack-widgets-std': '1.0.5-next',
        '@youwol/flux-pack-flows-std': '1.1.0-next',
        jquery: '3.2.1',
        bootstrap: '4.4.1',
        'reflect-metadata': '0.1.13',
        lodash: '4.17.15',
        tslib: '1.10.0',
        rxjs: '6.5.5',
        '@youwol/flux-lib-core': '1.2.0-next',
        'popper.js': '1.12.9',
    }
    const loadingGraph = {
        graphType: 'sequential',
        definition: [
            [
                '/api/cdn-backend/libraries/jquery/3.2.1/jquery-3.2.1.slim.min.js',
                '/api/cdn-backend/libraries/reflect-metadata/0.1.13/reflect-metadata.min.js',
                '/api/cdn-backend/libraries/lodash/4.17.15/lodash.min.js',
                '/api/cdn-backend/libraries/tslib/1.10.0/tslib.min.js',
                '/api/cdn-backend/libraries/rxjs/6.5.5/rxjs.umd.min.js',
                '/api/cdn-backend/libraries/popper.js/1.12.9/popper.min.js',
            ],
            [
                '/api/cdn-backend/libraries/bootstrap/4.4.1/bootstrap.min.js',
                '/api/cdn-backend/libraries/youwol/flux-lib-core/1.2.0-next/flux-lib-core.umd.js',
            ],
            [
                '/api/cdn-backend/libraries/youwol/flux-pack-youwol/0.0.0-next/flux-pack-youwol.umd.js',
                '/api/cdn-backend/libraries/youwol/flux-pack-utility-std/1.0.5-next/flux-pack-utility-std.umd.js',
                '/api/cdn-backend/libraries/youwol/flux-pack-widgets-std/1.0.5-next/flux-pack-widgets-std.umd.js',
                '/api/cdn-backend/libraries/youwol/flux-pack-flows-std/1.1.0-next/flux-pack-flows-std.umd.js',
            ],
        ],
    }

    const reqs = new Requirements(
        fluxComponents,
        fluxPacks,
        libraries,
        loadingGraph,
    )
    expect(reqs.fluxComponents).toEqual(fluxComponents)
    expect(reqs.fluxPacks).toEqual(fluxPacks)
    expect(reqs.libraries).toEqual(libraries)
    expect(reqs.loadingGraph).toEqual(loadingGraph)

    const d = new Description('name', 'description')
    expect(d.name).toBe('name')
    expect(d.description).toBe('description')

    const layer = new LayerTree({
        layerId: 'layerId',
        title: 'title',
        children: [],
        moduleIds: ['module0'],
        html: '',
        css: '',
    })
    expect(layer.layerId).toBe('layerId')
    expect(layer.title).toBe('title')
    expect(layer.children).toEqual([])
    expect(layer.moduleIds).toEqual(['module0'])

    const wf = new Workflow({
        modules: [1] as any,
        connections: [2] as any,
        plugins: [3] as any,
    })
    expect(wf.modules).toEqual([1] as any)
    expect(wf.connections).toEqual([2] as any)
    expect(wf.plugins).toEqual([3] as any)

    const project = new Project({
        name: 'name',
        schemaVersion: '0.0',
        description: 'description',
        requirements: reqs,
        workflow: wf,
        builderRendering,
    })
    expect(project.name).toBe('name')
    expect(project.schemaVersion).toBe('0.0')
    expect(project.description).toBe('description')
    expect(project.requirements).toEqual(reqs)
    expect(project.workflow).toEqual(wf)
    expect(project.builderRendering).toEqual(builderRendering)
})
