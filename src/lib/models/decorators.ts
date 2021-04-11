

import { ModuleFlux, ModuleRendererBuild, ModuleConfiguration, ModuleRendererRun, FluxPack } from './models-base';
import * as rxjs from 'rxjs'
import 'reflect-metadata'
import * as _ from 'lodash'

export let tmpFlows       = {}
export let tmpBases       = {}
export let tmpAttributes  = {}
export let tmpMethods     = {}
export let pack           = {}


export function Flux(metadata) {
  
  let pack = metadata["pack"] as FluxPack

  return (target) => {
    pack.addModule(metadata.id, metadata.namespace)
    let ModuleNamespace           = metadata.namespace      
    
    ModuleNamespace.id            = metadata.id          
    ModuleNamespace.packId        = pack.name            
    ModuleNamespace.uid           = metadata.id  + "@" + pack.name       
    ModuleNamespace.displayName   = metadata.displayName          
    ModuleNamespace.description   = metadata.description     
    ModuleNamespace.isPlugIn      = metadata.compatibility != undefined
    ModuleNamespace.compatibility = metadata.compatibility
    ModuleNamespace.resources     = metadata.resources
    ModuleNamespace.consumersData = {}
    
    
    // Generate Configuration class
    tmpBases                      = {}
    tmpAttributes                 = {}
    tmpMethods                    = {}

    ModuleNamespace["Configuration"] = class Configuration extends ModuleConfiguration {
      /**
       * should be : 
       * {title =metadata.id,description=metadata.description,data=ModuleNamespace.PersistentData()}
       * but there is no default when compiled ...?
       */
      constructor( d : any = {title:undefined,description:undefined,data:undefined}) {
          super({
            title: d.title == undefined ? metadata.displayName : d.title, 
            description:d.description == undefined ? metadata.description : d.description,
            data: d.data ||  new (ModuleNamespace.PersistentData)()
          }) 
      }
    }
  }
}

export function BuilderView(metadata) {

  return (target) => {
    let ModuleNamespace = metadata.namespace

    if(metadata.icon != undefined) 
      ModuleNamespace["BuilderView"] = 
        class BuilderView extends ModuleRendererBuild {

          constructor(){
            super({svgIcon:metadata.icon, Factory:ModuleNamespace})
          }
        }
    if(metadata.icon != undefined && metadata.render) 
      ModuleNamespace["BuilderView"] = 
        class BuilderView extends ModuleRendererBuild {

          static notifier$ = new rxjs.Subject()
          constructor(){
            super({svgIcon:metadata.icon, Factory:ModuleNamespace})
          }
          render(mdle:ModuleFlux) {
            let renderElem   = metadata.render(mdle, this.icon() )
            if (typeof renderElem =="string"){
                let renderingDiv = <HTMLDivElement>(document.createElement('div'))
                renderingDiv.innerHTML = metadata.render(mdle)
                return renderingDiv
            }
            return renderElem
          }
        }
  }
}
export function RenderView(metadata) {

  return (target) => {
    let ModuleNamespace = metadata.namespace

    ModuleNamespace["RenderView"] = 
    class RenderView extends ModuleRendererRun {

      static get wrapperDivAttributes() : (ModuleFlux) => Object {
        return metadata.wrapperDivAttributes
      }
      
      constructor(public readonly module: ModuleFlux) { 
        super() 
      }

      render() {
        let renderElem   = metadata.render(this.module)
        if (typeof renderElem =="string"){
            let renderingDiv = <HTMLDivElement>(document.createElement('div'))
            renderingDiv.innerHTML = metadata.render(this.module)
            return renderingDiv
        }
        return renderElem
      }
    }
}
}


export function Schema(metadata:any) {

  if( !metadata.pack["schemas"] )
    metadata.pack["schemas"] = {}

  return (target) => {

    let baseClass  = target.__proto__.name
    let attributes =  tmpAttributes[target.name] ?  tmpAttributes[target.name]["attributes"] : []
    let methods    = tmpMethods[target.name] ? tmpMethods[target.name]["methods"] : []
    
    let schema = { 
      attributes: attributes,
      methods: methods,
      extends: [baseClass],
    }
    metadata.pack["schemas"][target.name] = schema
    target.fluxSchema = { 
      attributes: attributes,
      methods: methods,
      extends: [target.__proto__],
    }
    tmpMethods = {}
    tmpAttributes = {}
  }
}

export function Property(metadata) {

  return (target, key) => {

    let object = tmpAttributes[target.constructor.name]

    if (object == undefined) {
      object = { type: "object" }
      tmpAttributes[target.constructor.name] = object
      object.attributes = object.attributes || {}
      tmpBases[target.constructor.name] = target.constructor.__proto__.name
    }
    var t = Reflect.getMetadata("design:type", target, key);
    object.attributes[key] = { type: t.name, class: t, name: key, metadata: metadata }
  }
}
export function Method(metadata) {

  return (target, key) => {
    let object = tmpMethods[target.constructor.name]

    if (object == undefined) {
      object = { type: "object" }
      tmpMethods[target.constructor.name] = object
      object.methods = object.methods || {}
    }
    var t = Reflect.getMetadata("design:paramtypes", target, key);
    var r = Reflect.getMetadata("design:returntype", target, key);

    let method = { arguments: t.map(p => p.name), return: r ? r.name : 'Any' , name: key, metadata: metadata }
    object.methods[key] = method
  }
}


export function flattenSchemaWithValue(instance) {

  let schema = instance.__proto__.constructor.fluxSchema
  let data = instance
  function flattenRecursive(schema, data, suffix:string) : Array<[string, any]> {

      let acc = {[suffix.slice(1)]:[schema,data] }
      
      if(schema && schema.extends){
          let props = schema.extends
          .filter( schema => schema.fluxSchema)
          .map( schema => schema.fluxSchema)
          .reduce( (acc,schema) => {
              return _.merge( acc , flattenRecursive(schema,data, suffix))
          } , {})

          _.merge( acc ,props)
      }
      
      if(schema && schema.type && schema.class && schema.class.fluxSchema){
          let props =  flattenRecursive(schema.class.fluxSchema, data, suffix)
          _.merge( acc ,props)
      }

      if(schema && schema.attributes){
          let props =  Object.entries(schema.attributes).reduce( (acc:Object, [key,val] :[any,any]) => {
              return _.merge( acc , flattenRecursive(val,data[key], `${suffix}.${key}`))}, {} )
          _.merge( acc ,props)
      }

      return Object.keys(acc)
      .filter(key =>  acc[key][0] )
      .reduce((obj:any, key:any) => { obj[key] = acc[key]; return obj;}, {});
  }
  return flattenRecursive(schema, data, "") 
}

