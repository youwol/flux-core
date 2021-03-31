

import * as rxjs from 'rxjs'
import * as operators from 'rxjs/operators'
import { instantiateModules, parseGraph , Runner, renderTemplate} from '../index'
import { DropDown, Console } from './test-modules'


test('static rendering working', () => {

   
    let branches = ['|~dropDown~|--$obs$---=a|~console~|'] 

    let confItems  = [{ text: "option 1", value: { n : 0 }},{ text: "option 2", value: { n : 1 }} ]
    
    let modules     = instantiateModules({
        "dropDown":[ DropDown, { items:confItems } ],
        "console": Console
    }) 
    let observers   = {
        obs:        new rxjs.Subject()
    }
    let adaptors    = {
        a : ( ({data,context,config}) => ({data,context,config}))
    }
    let graph       = parseGraph( { branches, modules, adaptors, observers } )
    
    new Runner( graph )  
   // let div = new Renderer(runner, `<div id='dropDown'> <div>`,"").render()

    let div = document.createElement("div")
    div.innerHTML = "`<div id='dropDown' class='flux-element'> <div>`"
    renderTemplate(div,graph.workflow.modules)

    let options = div.querySelectorAll("option")
    expect(options.length).toEqual(2)
    expect(options[0].innerHTML).toEqual("option 1")
    expect(options[1].innerHTML).toEqual("option 2")
})

test('dynamic interaction working', (done) => {

   
    let branches = ['|~dropDown~|--$obs$---=a|~console~|'] 

    let confItems  = [{ text: "option 1", value: { n : 0 }},{ text: "option 2", value: { n : 1 }} ]
    
    let modules     = instantiateModules({
        "dropDown":[ DropDown, { items:confItems } ],
        "console": Console
    }) 
    let observers   = {
        obs:        new rxjs.Subject()
    }
    observers.obs.pipe(
        operators.take(1)
    ).subscribe( (v:any) => {
        expect(v.n).toEqual(0)
    })
    observers.obs.pipe(
        operators.skip(1),
        operators.take(1)
    ).subscribe( (v:any) => {
        expect(v.n).toEqual(1)
        done()
    })

    let adaptors    = {
        a : ( ({data,context,config}) => ({data,context,config}))
    }
    let graph       = parseGraph( { branches, modules, adaptors, observers } )
    
    new Runner( graph )  

    let div = document.createElement("div")
    div.innerHTML = "`<div id='dropDown' class='flux-element'> <div>`"
    renderTemplate(div,graph.workflow.modules)
    
    let select = div.querySelector("select")
    select.selectedIndex = 1
    select.dispatchEvent(new Event('change'));    
})
