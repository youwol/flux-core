import { fetchJavascriptAddOn, fetchStyleSheets } from "@youwol/cdn-client"
import { from, Observable } from "rxjs"



export interface IEnvironment{


    fetchStyleSheets( resources: string | Array<string>) : Observable<Array<HTMLLinkElement>>

    fetchJavascriptAddOn( resources: string | Array<string> ): Observable<string[]>
}


export class Environment{

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
}
