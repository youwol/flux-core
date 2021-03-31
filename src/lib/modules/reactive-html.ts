import { Observable, Subscription } from 'rxjs'
import { tap } from 'rxjs/operators'
import * as _ from 'lodash'

export class HTMLReactiveElement{

    tag? : string = 'div'
    class? : string | Observable<string>
    id? : string | Observable<string>
    attributes? : any | Observable<any>
    style? : any | Observable<any>
    type? : any | Observable<any>
    children? : Array<HTMLReactiveElement> | Object
    innerHTML? : string | Observable<string>
    innerText? : string | Observable<string>
    textContent? : string | Observable<string>
    [key: string]: any | Observable<any>
    onclick?:       (Event) => any 
    onmousedown?:   (Event) => any 
    onmouseout?:    (Event) => any 
    onmouseenter?:  (Event) => any 
    onmouseleave?:  (Event) => any 
    onkeydown?:     (Event) => any 
    onchange?:      (Event) => any 
    ondragstart?:   (Event) => any 
    ondragenter?:   (Event) => any 
    ondragleave?:   (Event) => any 
    ondragover?:    (Event) => any 
    ondrop?:        (Event) => any 
    oncontextmenu?: (Event) => any 
    oninput?:       (Event) => any 
}
export function createHTMLElement( { data ,subscriptions = [], id = undefined , namespace =undefined, classesDict ={}} ) : HTMLElement{

    
    if( data instanceof HTMLDivElement)
        return data
        
    let tag = data['tag'] 
    if(!tag && id && id.substring(0,2)=="__")
        tag = id.substring(2,id.indexOf("_",3) )
    if(!tag)
        tag = 'div'

    if ( data instanceof Observable){
        // This div provide a handle where we insert the promised one...but it should not be there (it adds a 'phantom' div in the DOM structure )
        let phantomDiv = document.createElement("div")
        phantomDiv.classList.add("promised-futur")

        // the subscription issued from a new item are kept separated so that we can unsuscribe them when new item come
        // there is still leaking subscriptions, need to be improved
        // With the approach there is some subscriptions that are actually not pushed in subscriptions
        // We should try to get HTMLElement with their subscription => when a new come, we unsubscribe all
        // the childNodes recursively
        let childrenSubscriptions = new Array<Subscription>()

        let sub = data.pipe(
            tap( () => {
                childrenSubscriptions.forEach( s => s && s.unsubscribe())
                _.remove( subscriptions, (e,i) => childrenSubscriptions.includes(e) )
                childrenSubscriptions = []
            })
        ).subscribe( data => {
            data.tag = data.tag ? data.tag : tag
            let i0 = subscriptions.length
            let newDiv = createHTMLElement({data, subscriptions, namespace, classesDict})
            for(let i=i0; i<subscriptions.length; i++){
                childrenSubscriptions.push(subscriptions[i])
            }
            phantomDiv.replaceWith(newDiv);
            phantomDiv = newDiv as HTMLDivElement
        })

        subscriptions.push(sub)
        return phantomDiv
    }

    let elem = ( namespace == "svg" || data.namespace =="svg") ? document.createElementNS("http://www.w3.org/2000/svg", data.tag) : document.createElement(tag ) 
    //let elem = data.namespace=="svg" ? document.createElementNS("http://www.w3.org/2000/svg", data.tag) : document.createElement(tag ) 
    

    if(id)
        elem.id = id
        
    let specialBindings =  {
        tag:            ()=>{},
        attributes:     (elem, values) => Object.entries(values).forEach( ([k,v]) => elem.setAttribute(k,String(v))),
        style:          (elem, values) => Object.entries(values).forEach( ([k,v]) => elem.style.setProperty(k,String(v))),
        children:       (elem, values)  => {
                            return Object.entries(values)
                            .map( ([id,child]) => createHTMLElement( { data: child, subscriptions, id, namespace , classesDict} ) )
                            .filter( (c:HTMLElement) =>  c != undefined )
                            .forEach( (c:HTMLElement) => elem.appendChild(c))
                        },
        innerHtml:      (elem: HTMLElement, value) => {
            elem.innerHTML = value
        },   
        innerText:      (elem, value) => {
            elem.innerText = value // innerHtml is weird, got some issue with svg and g elem 
        },
        textContent:    (elem, value) => elem.textContent = value,
        onclick :       (elem, value) => elem.onclick = value ,
        onmousedown :   (elem, value) => elem.onmousedown = value,
        onmouseout :    (elem, value) => elem.onmouseout = value,
        onmouseenter :   (elem: HTMLDivElement, value) => elem.onmouseenter = value,
        onmouseleave :    (elem: HTMLDivElement, value) => elem.onmouseleave = value,
        onkeydown :     (elem, value) => elem.onkeydown = value,
        onchange :      (elem, value) => elem.onchange = value,
        ondragstart :   (elem, value) => elem.ondragstart = value,
        ondragenter :   (elem, value) => elem.ondragenter = value,
        ondragleave :   (elem, value) => elem.ondragleave = value,
        ondragover :    (elem, value) => elem.ondragover = value,
        ondrop:         (elem, value) => elem.ondrop = value,
        oncontextmenu : (elem, value) => elem.oncontextmenu = value,
        oninput :       (elem, value) => elem.oninput = value,
        _class :        (elem, value) => {
            if(elem["previousDynamicClasses"])
                elem["previousDynamicClasses"].forEach( c => elem.classList.remove(c) )

            let classes = value.split(" ").reduce( (acc,e)=> acc.concat(classesDict[e].split(" ")),[])
            elem["previousDynamicClasses"] = classes
            elem.classList.add(...classes) 
        },
    }
    
    function setAttribute(elem,k:string,value){

        specialBindings[k] ? specialBindings[k](elem, value) : 
            elem[k] != undefined ? elem[k] = value : elem.setAttribute(k, value) 
    }

    if(!data.children){
        data.children ={}
    }

    let entries =  Object.entries(data)

    entries.forEach( ([k,v] : [string, any ]) => { 
        if(k.substring(0,2)=="__"){
            
            if( v.length ) {
                v.forEach( (e,i) => data.children[k+"_"+i] = e)
            }
            else{
                data.children[k] = v
                v.tag = k.substring(2)
            }
        }
    })
    
    entries.filter( ([k,v]) => k.substring(0,2)!="__" ).forEach( ([k,v]) => {
        
        if ( v instanceof Observable ){ 
            let sub = v.subscribe( val => {
                setAttribute(elem,k,val) 
            })
            subscriptions.push(sub)
            return 
        }
        setAttribute(elem,k,v)
    })
    elem["_subscriptions"] = subscriptions
    return elem
}