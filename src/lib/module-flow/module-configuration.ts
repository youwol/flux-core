import { flattenSchemaWithValue } from "./decorators"
import { ModuleFlow } from "./models-base"
import * as _ from 'lodash'

enum StatusEnum{
    Error = "Error",
    Warning="Warning",
    Consistent = "Consistent"
}

export class ConfigurationStatus{

    constructor( 
        public readonly status: StatusEnum, 
        public readonly intrus: Array<string>,
        public readonly missings: Array<string>,
        public readonly typeErrors: Array<{attributeName:string, actualValue: string, expectedType: string, error: string}>
        ){}
    
    isError(): boolean{
        return this.status == StatusEnum.Error
    }
    isWarning(): boolean{
        return this.status == StatusEnum.Warning
    }
    isConsistent(): boolean{
        return this.status == StatusEnum.Consistent
    }
}


export function findIntrus( prefix, object, reference) : Array<string> {

    let firstLayerIntrus =  Object.entries(object)
    .filter( ([k,v])=> reference[k] == undefined )
    .map( ([k,v])=> prefix + "/" + k )
    let goodKeys =  Object.entries(object)
    .filter( ([k,v])=> reference[k] != undefined )
    .filter( ([k,v]) => !(typeof v=="string") && !(typeof v=="number") && !(typeof v=="boolean") && v!=undefined )

    return  firstLayerIntrus.concat( 
        goodKeys
        .map( ([k,v]) => findIntrus(prefix+"/"+k,object[k], reference[k] ))
        .reduce( (acc,e)=> acc.concat(e), []) ) 
}


export function isConsistent(key, val, schema){

    if(schema.metadata.type=="code")
        return true

    if(typeof val=="string" && schema.type!="String")
        return [false, key, val, schema.type, `Got 'string' while '${schema.type}' expected.` ]

    if(typeof val=="string" && schema.type=="String" && schema.metadata.enum && !schema.metadata.enum.includes(val))
        return [false, key, val, schema.type, `Got '${val}' while expected values from enum are: ${schema.metadata.enum}` ]

    if(typeof val=="number" && schema.type!="Number")
        return [false, key, val, schema.type, `Got 'number' while '${schema.type}' expected.` ]
    
    if(typeof val=="number" && schema.type=="Number" && schema.metadata && schema.metadata.type=="integer" && !Number.isInteger(val) )
        return [false, key, val, "Integer", `Got '${val}' while 'integer' expected` ]
    
    if(val==undefined && (schema.type=="Number" || schema.type=="String"))
        return [false, key, val, schema.type, `Got undefined while a string or number was expected` ]

    return true
}

export function typeErrors(flattened): Array<{attributeName:string, actualValue:string, expectedType:string, error: string}>{

    return Object.entries( flattened)
    .filter( ([k,v]) => v[0].metadata)
    .map(([k,v]) =>  isConsistent(k,v[1], v[0]))
    .filter( (d:any) => d.length)
    .map( d => ({attributeName:d[1], actualValue:d[2], expectedType:d[3], error: d[4]}) )
}


export function configurationStatus(
    mdle: ModuleFlow, 
    newConfig: {[key:string]: unknown} | undefined,
    ){
    if(!newConfig)
        return new ConfigurationStatus(StatusEnum.Consistent, [], [], [])

    let defaultConfig = mdle.configuration.data

    let mergedConfig = _.cloneDeep(defaultConfig)
    _.mergeWith(mergedConfig, newConfig)

    let newConfigWithSchema =  _.cloneDeep(newConfig)
    newConfigWithSchema.__proto__ = defaultConfig.__proto__
        
    let flattenedMerged = flattenSchemaWithValue(mergedConfig)

    if(mdle.Factory.id=="Dispatcher")
        return new ConfigurationStatus(StatusEnum.Consistent, [], [], [])
        
    let intrus = findIntrus("", newConfigWithSchema, defaultConfig)
    let missings = findIntrus("", defaultConfig, mergedConfig)
    let errorsType = typeErrors(flattenedMerged)
    /*
    let flattenedNew = flattenSchemaWithValue(newConfigWithSchema)
    let errorsTypeNew = typeErrors(flattenedNew)
    */
    if( errorsType.length + missings.length )
        return new ConfigurationStatus(StatusEnum.Error, intrus, missings, errorsType)
    
    let nonCodeIntrus = intrus.filter( (intru:string) => {
        let key = intru.split('/')[1]
        let metadata = flattenedMerged[key] && flattenedMerged[key][0] ? flattenedMerged[key][0].metadata : undefined
        if(!metadata)
            return true
        return metadata.type!="code"
    })

    if(nonCodeIntrus.length>0){
        return new ConfigurationStatus(StatusEnum.Warning, intrus, missings, errorsType)
    }
    
    return new ConfigurationStatus(StatusEnum.Consistent, intrus, missings, errorsType)
}

