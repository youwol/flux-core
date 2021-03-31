import { Observable, of, Subscription } from "rxjs"
import * as schemas from '../lib/flux-project/client-schemas'
import { IEnvironment } from "../lib/environment"
import { BuilderView, Flux, Property, RenderView, Schema } from "../lib/module-flow/decorators"
import { Connection, FluxPack, ModuleFlow, Pipe, PluginFlow } from "../lib/module-flow/models-base"
import { freeContract } from "../lib/module-flow/contract"
import { mockProjectsDB } from "./data/projects-data"
import { loadProjectDatabase$ } from "../lib/flux-project/loaders"
import { Project } from "../lib/flux-project/core-models"

import '../lib/modules/group.module'
import { testPack } from "./test-modules"

/*
let testPack = new FluxPack({
    name: 'flux-test',
    version: '0.0.0',
    description: 'flux pack to test'
})

export namespace SimpleModule {

    @Schema({
        pack: testPack,
        description: "Persistent Data of Explorer"
    })
    export class PersistentData  {

        @Property({ description: "property0" })
        readonly property0 : number

        constructor( {property0} : {property0?: number }= {}) {
            this.property0 = property0 != undefined ? property0 : 0
        }
    }

    @Flux({
        pack:           testPack,
        namespace:      SimpleModule,
        id:             "SimpleModule",
        displayName:    "SimpleModule",
        description:    "A simple module"
    })
    @BuilderView({
        namespace:      SimpleModule,
        icon:           `<path d=""/>`
    })
    @RenderView({
        namespace:      SimpleModule,
        render :        (mdle) => "<div type='test-div'></div>"
    })
    export class Module extends ModuleFlow{
        
        output0$ : Pipe<any>
    
        constructor(params){ 
            super(params)    
            this.addInput({
                id:"input0", description: 'an input', contract:freeContract(), 
                onTriggered: ({data, configuration, context}) => this.do(data, configuration, context) 
            })
            this.output0$ = this.addOutput({id:"output0"})
        }

        do(data, conf, ctx){
            this.output0$.next(data);
         }
    }
}

export namespace SimplePlugin {

    export class PersistentData  {

        @Property({ description: "property0" })
        readonly property0 : number

        constructor( {property0} : {property0?: number }= {}) {
            this.property0 = property0 != undefined ? property0 : 0
        }
    }

    @Flux({
        pack:           testPack,
        namespace:      SimplePlugin,
        id:             "SimplePlugin",
        displayName:    "SimplePlugin",
        description:    "plugin",
        compatibility:  { a: (mdle)=>true }
    })
    @BuilderView({
        namespace:      SimplePlugin,
        icon:           `<path d=""/>`
    })
    @RenderView({
        namespace:      SimplePlugin,
        render : (mdle) => "<div type='test-div'></div>"
    })
    export class Module extends PluginFlow<SimpleModule.Module>{

        constructor(params){ 
            super(params)    
            this.addInput({ 
                id:"input0", description: 'an input', contract:freeContract(), 
                onTriggered: ({data, configuration, context}) => this.do(data, configuration, context) 
            })
        }
        do(data, conf, ctx){}
    }
}*/

export class MockEnvironment implements IEnvironment{

    static css = new Array<HTMLLinkElement>()
    static jsAddons = new Array<string>()

    fetchStyleSheets( resources: string | Array<string>) : Observable<Array<HTMLLinkElement>>{

        resources = Array.isArray(resources) ? resources : [resources]
        let links = resources.map( r => {
            let link = new HTMLLinkElement()
            link.href = r 
            return link
        })
        MockEnvironment.css = [...MockEnvironment.css, ...links]
        return of(links)
    }

    fetchJavascriptAddOn( resources: string | Array<string> ): Observable<string[]>{

        resources = Array.isArray(resources) ? resources : [resources]
        MockEnvironment.jsAddons = [...MockEnvironment.jsAddons, ...resources]
        return of(resources)
    }

    fetchLoadingGraph(loadingGraph: schemas.LoadingGraph) : Observable<schemas.LoadingGraph>{
        window['flux-test'] = {
            pack:testPack
        }
        return of(loadingGraph)
    }

    getProject(projectId) : Observable<schemas.Project>{
        return of(mockProjectsDB[projectId])
    }

    postProject(projectId:string, project:Object ) : Observable<void> {
        throw Error("MockEnvironment.postProject not implemented")
    }

    getLoadingGraph(body) : Observable<schemas.LoadingGraph> {
        throw Error("MockEnvironment.getLoadingGraph not implemented")
    }
}


test('load empty project', (done) => {

    let environment = new MockEnvironment()
    let subscriptionsStore = new  Map<Connection,Subscription>()
    let project$ = loadProjectDatabase$('emptyProject', () => undefined,subscriptionsStore,environment, undefined)

    project$.subscribe( ({project, packages, modulesFactory}:{project:Project, packages, modulesFactory}) => {
        expect(project.name).toEqual("emptyProject")
        expect(project.workflow.modules).toEqual([])
        expect(project.builderRendering.modulesView).toEqual([])
        expect(project.builderRendering.connectionsView).toEqual([])
        expect(project.runnerRendering.layout).toEqual("")
        expect(project.runnerRendering.style).toEqual("")

        expect(packages.length).toEqual(1)
        expect(packages[0].name).toEqual("@youwol/flux-core")
        
        done()
    })
    expect( true ).toEqual(true)
})


test('load simple project', (done) => {

    let environment = new MockEnvironment()
    let subscriptionsStore = new  Map<Connection,Subscription>()
    let project$ = loadProjectDatabase$('simpleProject', () => undefined,subscriptionsStore,environment, undefined)

    project$.subscribe( ({project, packages, modulesFactory}:{project:Project, packages, modulesFactory}) => {
        expect(project.name).toEqual("simpleProject")
        expect(project.workflow.modules.length).toEqual(3)
        expect(project.workflow.plugins.length).toEqual(1)
        expect(project.workflow.connections.length).toEqual(2)
        expect(project.builderRendering.modulesView.length).toEqual(3)
        expect(project.builderRendering.connectionsView.length).toEqual(0)
        expect(project.runnerRendering.layout).toEqual("")
        expect(project.runnerRendering.style).toEqual("")

        expect(packages.length).toEqual(2)           
        expect(packages[0].name).toEqual("@youwol/flux-core")
        expect(packages[1].name).toEqual("flux-test")
        // 3 module factory: GroupModules@flux-core, SimpleModule@flux-test, SimplePlugin@flux-test,    
        expect(modulesFactory.size).toEqual(10)         
        expect(modulesFactory.has('{"module":"GroupModules","pack":"@youwol/flux-core"}')).toBeTruthy()
        expect(modulesFactory.has('{"module":"ModuleTest","pack":"flux-test"}')).toBeTruthy()
        expect(modulesFactory.has('{"module":"PluginTest","pack":"flux-test"}')).toBeTruthy()
        done()
    })
    expect( true ).toEqual(true)
})