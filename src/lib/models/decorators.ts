

import { ModuleFlux, ModuleRendererBuild, ModuleConfiguration, ModuleRendererRun, FluxPack } from './models-base';


import * as rxjs from 'rxjs'

import 'reflect-metadata'
import * as _ from 'lodash'

/**
 * @Hidden
 * > 💩 We should try to remove the use of this global variable 
 */
let tmpBases       = {}
/**
 * @Hidden
 * > 💩 We should try to remove the use of this global variable 
 */
let tmpAttributes  = {}

/**
 * ## Flux
 * 
 * Decorator associated to the class
 *  [ModuleFlux](../classes/lib_models_models_base.moduleflux.html) that registers modules in 
 * a [[FluxPack | pack]] and create general information in the 
 *  [Factory](../modules/lib_models_models_base.html#factory).
 *
 * Typical usage looks like:
 * 
 * ```typescript
 * @Flux({
 *       pack:           pack,
 *       namespace:      ModuleFilePicker,
 *       id:             "FilePicker",
 *       displayName:    "File Picker",
 *       description:    "This module allows to select a file from an id and a drive",
 *       resources: {
 *           'technical doc': `${pack.urlCDN}/dist/docs/modules/modulelocaldrive.html`
 *       }
 *   })
 * @BuilderView(...) // <- not related to the discussion
 * @RenderView(...) // <- not related to the discussion
 * class Module extends ModuleFlux{
 *      //...
 * }
 * 
 * ```
 * 
 * Similar decorators exist for features related to the module's view in the 
 * builder panel ([[BuilderView]]) or in the render panel ([[RenderView]]),
 * 
 * @param pack The [[FluxPack]] in which the module is registered
 * @param id id of the module, should be unique within the pack
 * @param namespace Englobing namespace of the module
 * @param displayName Display name
 * @param description Description
 * @param compatibility Required for plugins: specify compatibility with a parent module.
 * It is a dictionary *{[condition-name]: condition-fct}* where *condition-name* is a meaningful (short)
 * name for the condition and *condition-fct* the condition.
 * For a given *parentModule*, the plugin won't be able to be attached to it if any of 
 * the *condition-fct* return false when evaluated with *parentModule*.
 * @param resources Allows to provide resources to your module, it is a mapping between name and url
 * @return decorator
 */
export function Flux({ pack,id,namespace, displayName, description,compatibility, resources}:
  {
    pack: FluxPack,
    namespace: any,
    id: string,
    displayName?: string,
    resources?: {[key:string]: string},
    description?: string,
    compatibility?: {[key:string]:(parentModule:ModuleFlux)=> boolean}
  }) {
  
  // do not remove the unused 'target', mandatory for typescript to compile the decorator
  return (target) => {
    pack.addModule(id, namespace)
    let ModuleNamespace           = namespace      
    
    ModuleNamespace.id            = id          
    ModuleNamespace.packId        = pack.name            
    ModuleNamespace.uid           = id  + "@" + pack.name       
    ModuleNamespace.displayName   = displayName ||  id       
    ModuleNamespace.description   = description || "no description available"    
    ModuleNamespace.isPlugIn      = compatibility != undefined
    ModuleNamespace.compatibility = compatibility
    ModuleNamespace.resources     = resources || {}
    ModuleNamespace.consumersData = {}
    
    
    // Generate Configuration class
    tmpBases                      = {}
    tmpAttributes                 = {}

    if( ModuleNamespace.PersistentData == undefined )
        ModuleNamespace["PersistentData"] = class PersistentData{}
        
    ModuleNamespace["Configuration"] = class Configuration extends ModuleConfiguration {
      /**
       * should be : 
       * {title =metadata.id,description=metadata.description,data=ModuleNamespace.PersistentData()}
       * but there is no default when compiled ...?
       */
      constructor( d : any = {title:undefined,description:undefined,data:undefined}) {
          super({
            title: d.title == undefined ? displayName : d.title, 
            description:d.description == undefined ? description : d.description,
            data: d.data ||  new (ModuleNamespace.PersistentData)()
          }) 
      }
    }
  }
}


/**
 * ## BuilderView
 * 
 * Decorator associated to the class
 *  [ModuleFlux](../lib_models_models_base.moduleflux.html) providing
 * required features related to the builder view.
 * 
 * To generate a default view with a custom icon of your module, decorate the *Module* class with
 *  *@BuilderView* and provide some svg content (as string) to use as icon:
 * 
 * ```typescript
 * @BuilderView({
 *       namespace: ModuleNamespace,
 *       icon : "<!-- svg content goes here --!>"
 *   })
 * class Module extends ModuleFlux{
 *      //...
 * }
 * 
 * ```
 * > The svg content will be appropriately scaled and translated, do not worry about that 😇.
 * 
 * To go beyond the default view, there is all you need discussed in [[ModuleRendererBuild | custom builder view]].
 * 
 * @param namespace Englobing namespace of the module
 * @param icon svg content that represents the icon of the module. The content provided
 * is translated and scaled appropriately automatically, no need to worry about it.
 * @param render providing this function bypass the default view. See discussions in [[ModuleRendererBuild | custom builder view]].
 * @return decorator
 */
export function BuilderView( {namespace, icon, render}: {
    namespace: any, 
    icon: string, 
    render?: (ModuleFlux, icon:  string ) => SVGElement}
    ) {

  // do not remove the unused 'target', mandatory for typescript to compile the decorator
  return (target) => {

    let ModuleNamespace = namespace

    if(icon != undefined) 

      ModuleNamespace["BuilderView"] = 
        class BuilderView extends ModuleRendererBuild {

          constructor(){
            super({svgIcon:icon, Factory:ModuleNamespace})
          }
        }
    if(icon != undefined && render) 

      ModuleNamespace["BuilderView"] = 
        class BuilderView extends ModuleRendererBuild {

          static notifier$ = new rxjs.Subject()

          constructor(){
            super({svgIcon:icon, Factory:ModuleNamespace})
          }

          render(mdle:ModuleFlux) {
            let renderElem   = render(mdle, this.icon().content )
            return renderElem
          }
        }
  }
}


/**
 * ## Render view
 * 
 * The decorator @RenderView is used to define a rendering view.
 * The rendering view is a UI component that gets displayed on the rendering 
 * panel of Flux app from which the user can interact.
 * 
 * > You can use any framework to create the view - as long as an HTMLElement is returned -,
 * > we internally use [flux-view](https://github.com/youwol/flux-view) as it is built on top of
 * > RxJs just like this library.
 * 
 * To illustrate the discussion with a view that displays the last emitted output of a module:
 * 
 * ```typescript
 * import {render, attr$} from '@youwol/flux-view'
 * 
 * @RenderView<Module>({
 *       namespace:      ModuleNamespace,
 *       render :        (mdle: ModuleFlux) => {
 *          return render({
 *              class: 'text-primary',
 *              innerText: attr$(
 *                  mdle.output$,
 *                  (value: number) => `The output is ${value}`,
 *                  {untilFirst: "No output emitted yet"}
 *          })
 *       }
 *   })
 * class Module extends ModuleFlux{
 * 
 *      output$ : Pipe<number>
 *      //...
 * }
 * ``` 
 * 
 * Note that you can provide a *wrapperDivAttributes* parameters to the 
 * decorator to control the style and classes of the wrapper div of your UI component.
 * 
 * More advanced use cases are discussed with the class [[ModuleRendererRun]].
 * 
 * @param namespace  Englobing namespace of the module
 * @param wrapperDivAttributes The view of a module is always encapsulated in Flux in a
 * wrapper div; *wrapperDivAttributes* allows to add classes or set style on this div.
 * @param render the rendering function
 * @returns decorator
 */
export function RenderView<T extends ModuleFlux>({namespace, wrapperDivAttributes, render}: {
  namespace: any, 
  wrapperDivAttributes?: (module: T) => { class?: string, style?:{[key:string]: string}}, 
  render?: (module: T) => HTMLElement | string}
  ) {

  wrapperDivAttributes = wrapperDivAttributes || (() => ({}) )
  // do not remove the unused 'target', mandatory for typescript to compile the decorator
  return (target) => {

    let ModuleNamespace = namespace

    ModuleNamespace["RenderView"] = 
    class RenderView extends ModuleRendererRun<T> {

      static get wrapperDivAttributes() : (ModuleFlux) => { class?: string, style?:{[key:string]: string}} {
        return wrapperDivAttributes
      }
      
      constructor(module: T, wrapperDivAttributes: (module: ModuleFlux) => { class: string, style:{[key:string]: string}}) { 
        super(module, wrapperDivAttributes) 
      }

      render() : HTMLElement {
        let view   = render(this.module)
        if (typeof view =="string"){

            let renderingDiv = <HTMLDivElement>(document.createElement('div'))
            renderingDiv.innerHTML = view
            return renderingDiv
        }
        return view
      }
    }
}
}

/**
 * ## Schema
 * 
 * The Schema class decorator provides a simplify approach to describe 
 * a data-structure in order to:
 * -    get an automatic view generation (e.g. in the settings panel of Flux)
 * -    provide a mechanism of schema validation (e.g. used in [[mergeConfiguration]])
 * 
 * When declaring a Schema, the [[Property]] attributes decorator needs to be used 
 * to register the list of attributes of the schema. Properties can be either 
 * a native types (with eventual additional metadata - e.g. *type: integer*) or reference other schemas. 
 * 
 * The next snippet presents the general case of a PesistentData 
 * composing others schemas:
 *
 *
 * ``` typescript
 * 
 *  Enum TypesExample{
 *    Example0 = 'example0',
 *    Example1 = 'example1' *    
 *  }
 *  // To provide an example of PersistentData inheriting from an existing class
 *  @Schema({pack}) export class SomeBaseModel{
 * 
 *      @Property({description:'some enum', enum: Object.values(TypesExample) })
 *      type: string
 * 
 *      constructor({type} :{type?:TypesExample}= {}) {
 *          // the default values of the properties are defined here
 *          this.type = type != undefined ? type : Types.Example0
 *      }
 *  }
 *
 *  // To provide an example of PersistentData composing from an existing class
 *  @Schema({pack}) export class Vector3D{
 *
 *      @Property({description: 'x coordinates'}) x: number
 *      @Property({description: 'y coordinates'}) y: number
 *      @Property({description: 'z coordinates'}) z: number
 *
 *      constructor({x, y, z} :{x?:number, y?: number, z?: number}= {
 *          this.x = x != undefined ? x : 0         
 *          this.y = y != undefined ? y : 0
 *          this.z = z != undefined ? z : 0
 *      })
 *  }
 *
 *  @Schema({pack})
 *  // We want to inherit all the properties defined in the class SomeBaseModel
 *  export class PersistentData extends SomeBaseModel {
 *
 *      @Property({
 *          description: 'a simple type',
 *          type: 'integer' // simple types may have some additional description available
 *      })
 *      value0 : number
 *
 *      @Property({
 *          description: 'a nested type'
*      })
 *      value1 : Vector3D
 *
 *      constructor({value0, value1, ...rest} :{value0?:number, value1?: unknown}= {}) {
 *          // this next line call the construction of SomeBaseConfiguration by forwarding the required parameters
 *          super(rest)
 *          // the default values of the properties are defined here
 *          this.value0 = value0 != undefined  ? value0  : 0
 *          this.value1 = value1 != undefined 
 *            ? new Vector3D(value1) 
 *            : new Vector3D({x:0,y:0,z:0})
 *      }
 * }
 * ```
 * 
 * @param pack the [[FluxPack]]
 * @param description description 
 * @returns the decorator
 */
export function Schema({pack, description}: {pack: any, description?: string}) {

  if( !pack["schemas"] )
    pack["schemas"] = {}

  return (target) => {

    let baseClass  = target.__proto__.name
    let attributes =  tmpAttributes[target.name] ?  tmpAttributes[target.name]["attributes"] : []
    
    let schema = { 
      attributes: attributes,
      extends: [baseClass],
    }
    pack["schemas"][target.name] = schema
    target.fluxSchema = { 
      attributes: attributes,
      extends: [target.__proto__],
    }
    tmpAttributes = {}
  }
}

/**
 * ## Property 
 * 
 * The Property decorator exposes a [[Schema | schema]] attribute.
 * Properties' type can be a:
 * -    native type: boolean, string, number
 * -    other classes decorated with *@Schema*
 * 
 * A complete example is provided in the documentation of [[Schema]].
 * 
 * ### Native types extension
 * 
 * A couple of extension of native types are available by providing additional metadata (on top of description).
 * -    enums: e.g. ```@property({description: 'an enum', enum:['v0','v1']}) value : string```
 * -    integer: e.g. ```@property({description: 'an integer', type:'integer'}) value : string```
 * -    some piece of code: e.g. ```@property({description: 'an integer', type:'code'}) value : string```
 * 
 * > 🔮 More of such extended native types will come in the future (e.g. range, date, etc).
 * 
 * @param metadata 
 * @returns 
 */
export function Property(metadata: { description?: string, [key:string]: any }) {

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

/**
 * @Hidden
 */
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

