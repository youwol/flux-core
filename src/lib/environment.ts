import { fetchJavascriptAddOn, fetchLoadingGraph, fetchStyleSheets, LoadingGraph } from "@youwol/cdn-client"
import { from, Observable, of } from "rxjs"
import { map } from "rxjs/operators"
import { LoadingGraphSchema, ProjectSchema } from "./flux-project/client-schemas";
import { FluxPack } from "./module-flow/models-base";


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

export interface IEnvironment{

    console: {
        log:(message?: any, ...optionalParams: any[])=> void,
        warn:(message?: any, ...optionalParams: any[])=> void,
        error:(message?: any, ...optionalParams: any[])=> void,
    }

    fetchStyleSheets( resources: string | Array<string>) : Observable<Array<HTMLLinkElement>>

    fetchJavascriptAddOn( resources: string | Array<string> ): Observable<string[]>

    fetchLoadingGraph(loadingGraph: LoadingGraphSchema) : Observable<LoadingGraphSchema>

    getProject(projectId) : Observable<ProjectSchema>

    postProject(projectId:string, project:Object ) : Observable<void> 

    getLoadingGraph({libraries}:{libraries:{[key:string]: string}}) : Observable<LoadingGraphSchema>
}


export class Environment implements IEnvironment{

    executingWindow: Window
    renderingWindow: Window

    console: {
        log:(message?: any, ...optionalParams: any[])=> void,
        warn:(message?: any, ...optionalParams: any[])=> void,
        error:(message?: any, ...optionalParams: any[])=> void,
    }

    constructor( data:
                {executingWindow: Window, renderingWindow: Window , console: Console },
                console?){

        this.renderingWindow = data.renderingWindow
        this.executingWindow = data.executingWindow
        this.console = data.console || console
    }

    fetchStyleSheets( resources: string | Array<string>) : Observable<Array<HTMLLinkElement>>{

        return from(fetchStyleSheets(resources, this.renderingWindow))
    }

    fetchJavascriptAddOn( resources: string | Array<string> ): Observable<string[]>{

        return from(fetchJavascriptAddOn( resources, this.executingWindow))
    }

    fetchLoadingGraph(loadingGraph: LoadingGraph) : Observable<LoadingGraphSchema> {

        return from(fetchLoadingGraph(loadingGraph, this.executingWindow)).pipe(
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

    getLoadingGraph({libraries}:{libraries:{[key:string]: string}}) : Observable<LoadingGraphSchema> {
    
        let url = `/api/cdn-backend/queries/loading-graph`
        let request = new Request(url, { method:'POST', body: JSON.stringify({libraries})})
        return createObservableFromFetch(request)
    }
}


export class MockEnvironment implements IEnvironment{

    static css = new Array<string>()
    static jsAddons = new Array<string>()

    public readonly fluxPacksDB: {[key:string]: FluxPack}

    public console: Console

    constructor(
        public readonly projectsDB: {[key:string]: ProjectSchema} = {},
        fluxPacks: Array<FluxPack> = []){
        
        this.fluxPacksDB = fluxPacks.reduce((acc,e) => ({...acc, ...{[e.name]:e}}), {})
        this.console = console
    }

    fetchStyleSheets( resources: string | Array<string>) : Observable<Array<HTMLLinkElement>>{

        resources = Array.isArray(resources) ? resources : [resources]
        MockEnvironment.css = [...MockEnvironment.css, ...resources]
        return of(resources as unknown as Array<HTMLLinkElement>)
    }

    fetchJavascriptAddOn( resources: string | Array<string> ): Observable<string[]>{

        resources = Array.isArray(resources) ? resources : [resources]
        MockEnvironment.jsAddons = [...MockEnvironment.jsAddons, ...resources]
        return of(resources)
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
        throw Error("MockEnvironment.postProject not implemented")
    }

    getLoadingGraph({libraries}: {libraries:{[key:string]: string}}) : Observable<LoadingGraphSchema> {
        throw Error("MockEnvironment.getLoadingGraph not implemented")
    }
}
