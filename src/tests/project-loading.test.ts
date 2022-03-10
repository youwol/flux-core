/** @format */

import { Subject, Subscription } from 'rxjs'
import { MockEnvironment } from '../lib/environment'
import { Connection } from '../lib/models/models-base'
import { mockProjectsDB } from './data/projects-data'
import { loadProjectDatabase$ } from '../lib/flux-project/loaders'
import { Project, Workflow } from '../lib/flux-project/core-models'

import '../lib/modules/group.module'
import { testPack } from '../lib/modules/test-modules'
import './test-modules'

const environment = new MockEnvironment({
    projectsDB: mockProjectsDB as any,
    fluxPacks: [testPack],
})

test('load empty project', (done) => {
    const subscriptionsStore = new Map<Connection, Subscription>()
    const workflow$ = new Subject<Workflow>()
    const project$ = loadProjectDatabase$(
        'emptyProject',
        workflow$,
        subscriptionsStore,
        environment,
    )

    project$.subscribe(
        ({
            project,
            packages,
            modulesFactory,
        }: {
            project: Project
            packages
            modulesFactory
        }) => {
            expect(project.name).toBe('emptyProject')
            expect(project.workflow.modules).toEqual([])
            expect(project.builderRendering.modulesView).toEqual([])
            expect(project.builderRendering.connectionsView).toEqual([])

            expect(packages).toHaveLength(1)
            expect(packages[0].name).toBe('@youwol/flux-core')

            done()
        },
    )
    expect(true).toBe(true)
})

test('load simple project', (done) => {
    const subscriptionsStore = new Map<Connection, Subscription>()
    const workflow$ = new Subject<Workflow>()
    const project$ = loadProjectDatabase$(
        'simpleProject',
        workflow$,
        subscriptionsStore,
        environment,
    )

    project$.subscribe(
        ({
            project,
            packages,
            modulesFactory,
        }: {
            project: Project
            packages
            modulesFactory
        }) => {
            expect(project.name).toBe('simpleProject')
            expect(project.workflow.modules).toHaveLength(3)
            expect(project.workflow.plugins).toHaveLength(1)
            expect(project.workflow.connections).toHaveLength(2)
            expect(project.builderRendering.modulesView).toHaveLength(3)
            expect(project.builderRendering.connectionsView).toHaveLength(0)

            expect(packages).toHaveLength(2)
            expect(packages[0].name).toBe('@youwol/flux-core')
            expect(packages[1].name).toBe('flux-test')

            expect(modulesFactory.size).toBe(8)
            expect(
                modulesFactory.has(
                    '{"module":"GroupModules","pack":"@youwol/flux-core"}',
                ),
            ).toBeTruthy()
            expect(
                modulesFactory.has(
                    '{"module":"ModuleTest","pack":"flux-test"}',
                ),
            ).toBeTruthy()
            expect(
                modulesFactory.has(
                    '{"module":"PluginTest","pack":"flux-test"}',
                ),
            ).toBeTruthy()
            done()
        },
    )
    expect(true).toBe(true)
})
