import { fetchJavascriptAddOn, fetchLoadingGraph, fetchStyleSheets, LoadingGraph } from "@youwol/cdn-client"
import { from, Observable } from "rxjs"
import { map } from "rxjs/operators"
import * as schemas from './flux-project/client-schemas'


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
