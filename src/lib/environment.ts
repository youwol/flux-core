import { fetchJavascriptAddOn, fetchLoadingGraph, fetchStyleSheets, LoadingGraph } from "@youwol/cdn-client"
import { from, Observable, of } from "rxjs"
import { map } from "rxjs/operators"
import * as schemas from './flux-project/client-schemas'
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


    fetchStyleSheets( resources: string | Array<string>) : Observable<Array<HTMLLinkElement>>

    fetchJavascriptAddOn( resources: string | Array<string> ): Observable<string[]>

    fetchLoadingGraph(loadingGraph: schemas.LoadingGraph) : Observable<schemas.LoadingGraph>

    getProject(projectId) : Observable<schemas.Project>

    postProject(projectId:string, project:Object ) : Observable<void> 

    getLoadingGraph({libraries}:{libraries:{[key:string]: string}}) : Observable<schemas.LoadingGraph>
}


export class Environment implements IEnvironment{

    executingWindow: Window
    renderingWindow: Window

    constructor({executingWindow, renderingWindow, backend }:
                {executingWindow: Window, renderingWindow: Window , backend: any }){

        this.renderingWindow=renderingWindow
        this.executingWindow=executingWindow
    }

    fetchStyleSheets( resources: string | Array<string>) : Observable<Array<HTMLLinkElement>>{

        return from(fetchStyleSheets(resources, this.renderingWindow))
    }

    fetchJavascriptAddOn( resources: string | Array<string> ): Observable<string[]>{

        return from(fetchJavascriptAddOn( resources, this.executingWindow))
    }

    fetchLoadingGraph(loadingGraph: LoadingGraph) : Observable<schemas.LoadingGraph> {

        return from(fetchLoadingGraph(loadingGraph, this.executingWindow)).pipe(
            map( () => loadingGraph)
        )
    }

    getProject(projectId) : Observable<schemas.Project> {

        let url =  `/api/assets-gateway/raw/flux-project/${projectId}`
        var request = new Request(url, {  method: 'GET', headers: {}, });
        return createObservableFromFetch(request)
    }
    
    postProject(projectId:string, project:Object ) : Observable<void> {

        let url = `/api/flux-backend/projects/${projectId}`
        var request = new Request(url, {  method: 'POST', headers: {}, body : JSON.stringify(project)});
        
        return createObservableFromFetch(request)
    }

    getLoadingGraph({libraries}:{libraries:{[key:string]: string}}) : Observable<schemas.LoadingGraph> {
    
        let url = `/api/cdn-backend/queries/loading-graph`
        let request = new Request(url, { method:'POST', body: JSON.stringify({libraries})})
        return createObservableFromFetch(request)
    }
}


export class MockEnvironment implements IEnvironment{

    static css = new Array<HTMLLinkElement>()
    static jsAddons = new Array<string>()

    public readonly fluxPacksDB: {[key:string]: FluxPack}

    constructor(
        public readonly projectsDB: {[key:string]: schemas.Project},
        fluxPacks: Array<FluxPack>){
        
        this.fluxPacksDB = fluxPacks.reduce((acc,e) => ({...acc, ...{[e.name]:e}}), {})
    }

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
        loadingGraph.lock.forEach(
            (resource) => {
                window[resource.name] = {pack:this.fluxPacksDB[resource.name]}
            }
        )
        return of(loadingGraph)
    }

    getProject(projectId: string) : Observable<schemas.Project>{

        if(!this.projectsDB[projectId]){
            throw Error(`The project with id ${projectId} can not be found `)
        }
        return of(this.projectsDB[projectId])
    }

    postProject(projectId:string, project: schemas.Project ) : Observable<void> {
        throw Error("MockEnvironment.postProject not implemented")
    }

    getLoadingGraph({libraries}: {libraries:{[key:string]: string}}) : Observable<schemas.LoadingGraph> {
        throw Error("MockEnvironment.getLoadingGraph not implemented")
    }
}
