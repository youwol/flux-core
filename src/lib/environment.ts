import { CdnEvent, fetchJavascriptAddOn, fetchLoadingGraph, fetchStyleSheets, getAssetId, getLoadingGraph, LoadingGraph, parseResourceId } from "@youwol/cdn-client"
import { url } from "node:inspector";
import { from, Observable, of, ReplaySubject, Subject } from "rxjs"
import { map } from "rxjs/operators"
import { LoadingGraphSchema, ProjectSchema } from "./flux-project/client-schemas";
import { ErrorLog } from "./models/context";
import { FluxPack, HostCommandRequest } from "./models/models-base";


export function createObservableFromFetch( request, extractFct = (d) =>d ){

    return Observable.create(observer => {
        fetch(request)
          .then(response => response.json()) // or text() or blob() etc.
          .then(data => {
            observer.next( extractFct(data));
            observer.complete();
          })
          .catch(err => observer.error(err));
    });
}

type IConsole = {
    log:(message?: any, ...optionalParams: any[])=> void,
    warn:(message?: any, ...optionalParams: any[])=> void,
    error:(message?: any, ...optionalParams: any[])=> void,
}

export interface IEnvironment{

    console: IConsole
    
    errors$ : Subject<ErrorLog>
    
    hostCommandRequest$ : Subject<HostCommandRequest>
    
    fetchStyleSheets( resources: string | Array<string>) : Observable<Array<HTMLLinkElement>>

    fetchJavascriptAddOn( resources: string | Array<string> , onEvent?: (CdnEvent) => void): Observable<{assetName, assetId, url, src}[]>

    fetchLoadingGraph(loadingGraph: LoadingGraphSchema, onEvent?: (CdnEvent) => void) : Observable<LoadingGraphSchema>

    getProject(projectId) : Observable<ProjectSchema>

    postProject(projectId:string, project:Object ) : Observable<void> 

    getLoadingGraph({libraries}:{libraries:{[key:string]: string}}) : Observable<LoadingGraphSchema>

}

export class Environment implements IEnvironment{

    public readonly executingWindow: Window
    public readonly renderingWindow: Window

    public readonly errors$ = new ReplaySubject<ErrorLog>()
    public readonly hostCommandRequest$ = new  Subject<HostCommandRequest>()
    public readonly console: IConsole

    constructor( data:
                {executingWindow: Window, renderingWindow: Window , console?: Console }){

        this.renderingWindow = data.renderingWindow
        this.executingWindow = data.executingWindow
        this.console = data.console || console
    }

    fetchStyleSheets( resources: string | Array<string>) : Observable<Array<HTMLLinkElement>>{

        return from(fetchStyleSheets(resources, this.renderingWindow))
    }

    fetchJavascriptAddOn( resources: string | Array<string> , onEvent?: (CdnEvent) => void): Observable<{assetName, assetId, url, src}[]>{

        return from(fetchJavascriptAddOn( resources, this.executingWindow, onEvent))
    }

    fetchLoadingGraph(loadingGraph: LoadingGraph , onEvent?: (CdnEvent) => void) : Observable<LoadingGraphSchema> {

        return from(fetchLoadingGraph(loadingGraph, this.executingWindow, undefined, onEvent)).pipe(
            map( () => loadingGraph)
        )
    }

    getProject(projectId) : Observable<ProjectSchema> {

        let url =  `/api/assets-gateway/raw/flux-project/${projectId}`
        var request = new Request(url, {  method: 'GET', headers: {}, });
        return createObservableFromFetch(request)
    }
    
    postProject(projectId:string, project:Object ) : Observable<void> {

        let url = `/api/flux-backend/projects/${projectId}`
        var request = new Request(url, {  method: 'POST', headers: {}, body : JSON.stringify(project)});
        
        return createObservableFromFetch(request)
    }

    getLoadingGraph(body:{libraries:{[key:string]: string}}) : Observable<LoadingGraphSchema> {
    
        return from(getLoadingGraph(body))
    }
}

export type KeyLoadingGraphStore = {libraries:{[key:string]: string}, using:{[key:string]: string}}

export class MockEnvironment implements IEnvironment{

    css = new Array<string>()
    jsAddons = new Array<string>()
    savedProjects : {[key:string]: ProjectSchema} = {}

    public readonly projectsDB: {[key:string]: ProjectSchema}
    public readonly fluxPacksDB: {[key:string]: FluxPack}
    public readonly loadingGraphResponses: {[key:string]: LoadingGraphSchema}
    public readonly console: IConsole

    public readonly errors$ = new ReplaySubject<ErrorLog>()
    public readonly hostCommandRequest$ = new  Subject<HostCommandRequest>()
    
    constructor(
        data: {
            projectsDB?: {[key:string]: ProjectSchema},
            fluxPacks?: Array<FluxPack>,
            console?: IConsole,
            loadingGraphResponses?: Array<[KeyLoadingGraphStore, LoadingGraphSchema]>
        } = {}){
        this.projectsDB = data.projectsDB || {}
        this.fluxPacksDB = data.fluxPacks 
            ? data.fluxPacks.reduce((acc,e) => ({...acc, ...{[e.name]:e}}), {}) 
            : {}
        this.loadingGraphResponses = data.loadingGraphResponses 
            ? data.loadingGraphResponses.reduce((acc,[k,v]) => ({...acc, ...{[JSON.stringify(k)]:v}}), {}) 
            : {} 
        this.console = data.console || console
    }

    fetchStyleSheets( resources: string | Array<string>) : Observable<Array<HTMLLinkElement>>{

        resources = Array.isArray(resources) ? resources : [resources]
        this.css = [...this.css, ...resources]
        return of(resources as unknown as Array<HTMLLinkElement>)
    }

    fetchJavascriptAddOn( resources: string | Array<string> ): Observable<{assetName, assetId, url, src}[]>{

        resources = Array.isArray(resources) ? resources : [resources]
        let parsed = resources.map( (r) => parseResourceId(r))
        this.jsAddons = [...this.jsAddons, ...resources]
        return of(parsed.map( ({name, url, assetId}) => {
            return {assetName:name, assetId, url, src:""}
        }))
    }

    fetchLoadingGraph(loadingGraph: LoadingGraphSchema) : Observable<LoadingGraphSchema>{
        loadingGraph.lock.forEach(
            (resource) => {
                window[resource.name] = {pack:this.fluxPacksDB[resource.name]}
            }
        )
        return of(loadingGraph)
    }

    getProject(projectId: string) : Observable<ProjectSchema>{

        if(!this.projectsDB[projectId]){
            throw Error(`The project with id ${projectId} can not be found `)
        }
        return of(this.projectsDB[projectId])
    }

    postProject(projectId:string, project: ProjectSchema ) : Observable<void> {
        this.savedProjects[projectId] = project
        return of()
    }

    getLoadingGraph(body: KeyLoadingGraphStore) : Observable<LoadingGraphSchema> {

        let key = JSON.stringify(body)
        if(!this.loadingGraphResponses[key])
            throw Error(`MockEnvironment.getLoadingGraph: loading graph not found for key: ${key}` )

        return of(this.loadingGraphResponses[key])
    }
}
