import { Subject, Subscription } from "rxjs"
import { MockEnvironment } from "../lib/environment"
import { Connection } from "../lib/models/models-base"
import { mockProjectsDB } from "./data/projects-data"
import { loadProjectDatabase$ } from "../lib/flux-project/loaders"
import { Project, Workflow } from "../lib/flux-project/core-models"

import '../lib/modules/group.module'
import { testPack } from "../lib/modules/test-modules"
import './test-modules'

let environment = new MockEnvironment({
    projectsDB: mockProjectsDB as any, 
    fluxPacks:[testPack]
})


test('load empty project', (done) => {

    let subscriptionsStore = new  Map<Connection,Subscription>()
    let workflow$ = new Subject<Workflow>()
    let project$ = loadProjectDatabase$('emptyProject', workflow$ ,subscriptionsStore,environment)

    project$.subscribe( ({project, packages, modulesFactory}:{project:Project, packages, modulesFactory}) => {
        expect(project.name).toEqual("emptyProject")
        expect(project.workflow.modules).toEqual([])
        expect(project.builderRendering.modulesView).toEqual([])
        expect(project.builderRendering.connectionsView).toEqual([])

        expect(packages.length).toEqual(1)
        expect(packages[0].name).toEqual("@youwol/flux-core")
        
        done()
    })
    expect( true ).toEqual(true)
})


test('load simple project', (done) => {

    let subscriptionsStore = new  Map<Connection,Subscription>()
    let workflow$ = new Subject<Workflow>()
    let project$ = loadProjectDatabase$('simpleProject', workflow$,subscriptionsStore,environment)

    project$.subscribe( ({project, packages, modulesFactory}:{project:Project, packages, modulesFactory}) => {
        expect(project.name).toEqual("simpleProject")
        expect(project.workflow.modules.length).toEqual(3)
        expect(project.workflow.plugins.length).toEqual(1)
        expect(project.workflow.connections.length).toEqual(2)
        expect(project.builderRendering.modulesView.length).toEqual(3)
        expect(project.builderRendering.connectionsView.length).toEqual(0)

        expect(packages.length).toEqual(2)           
        expect(packages[0].name).toEqual("@youwol/flux-core")
        expect(packages[1].name).toEqual("flux-test")
         
        expect(modulesFactory.size).toEqual(8)         
        expect(modulesFactory.has('{"module":"GroupModules","pack":"@youwol/flux-core"}')).toBeTruthy()
        expect(modulesFactory.has('{"module":"ModuleTest","pack":"flux-test"}')).toBeTruthy()
        expect(modulesFactory.has('{"module":"PluginTest","pack":"flux-test"}')).toBeTruthy()
        done()
    })
    expect( true ).toEqual(true)
})
