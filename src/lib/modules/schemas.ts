import { Schema, Property } from "../module-flow/decorators"
import { packCore } from './factory-pack-core'


let defaultVariableCode = `
/* you can provide variable accessible in the group here
* e.g. 'return { someParameter: 1 }
* To use 'someParameter' in a module configuration...to be defined
*/
return {}
` 
export namespace Schemas{

  @Schema({
    pack: packCore,
    description: "GroupModuleConfiguration"
  })
  export class GroupModuleConfiguration {

    @Property({
        description:"explicitInputsCount",
        type:"integer"
    })
    explicitInputsCount : number

    @Property({
      description:"explicitOutputsCount",
      type:"integer"
    })
    explicitOutputsCount : number

    @Property({
        description:"creation function",
        type:"code"
    })
    environment : string

    constructor({explicitInputsCount,explicitOutputsCount, environment}:
      {explicitInputsCount?:number,explicitOutputsCount?:number, environment?:string} = { }){

        this.explicitInputsCount = explicitInputsCount != undefined ? explicitInputsCount : 0
        this.explicitOutputsCount = explicitOutputsCount != undefined ? explicitOutputsCount : 0
        this.environment = environment != undefined ? environment : defaultVariableCode
    }
  }


}