import { flattenSchemaWithValue } from "./decorators"
import * as _ from 'lodash'

export class ConfigurationStatus<T>{

    constructor(
        public readonly original: T, 
        public readonly newAttributes, 
        public readonly result: T, 
        public readonly intrus: Array<string> = []
        ){}
}

export class ConsistentConfiguration<T> extends ConfigurationStatus<T>{

    constructor( 
        original: T, 
        newAttributes,
        result: T,
        intrus: Array<string> = []){
            super(original, newAttributes, result, intrus)
        }
}

export class UnconsistentConfiguration<T> extends ConfigurationStatus<T>{

    constructor( 
        original: T, 
        newAttributes,
        result: T, 
        intrus: Array<string>,
        public readonly missings: Array<string>,
        public readonly typeErrors: Array<{attributeName:string, actualValue: string, expectedType: string, error: string}>){
            super(original, newAttributes, result, intrus)
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
    // We may want to deal with code in order to accept javascript function
    // if(schema.metadata.type=="code")
    //    return true

    if( schema.type=="String" && schema.metadata.enum && typeof val!="string" )
        return [false, key, val, schema.type, `Got '${typeof val}' while 'String' expected as part of enum.` ]

    if( schema.type=="String" && schema.metadata.enum && typeof val=="string" && !schema.metadata.enum.includes(val))
        return [false, key, val, schema.type, `Got '${val}' while expected values from enum are: ${schema.metadata.enum}.`  ]

    if( schema.type=="String" && typeof val!="string")
        return [false, key, val, schema.type, `Got '${typeof val}' while 'String' expected.` ]

    if( schema.type=="Number" && schema.metadata && schema.metadata.type=="integer" && !Number.isInteger(val) )
        return [false, key, val, "Integer", `Got '${val}' while 'integer' expected.` ]
   
    if( schema.type=="Number" && typeof(val) != 'number')
        return [false, key, val, schema.type, `Got '${typeof val}' while 'Number' expected.` ]
        
    if( schema.attributes && typeof(val) != 'object')
        return [false, key, val, schema.type, `Got '${typeof val}' while '${schema.type}' expected.` ]

    if(val==undefined && (schema.type=="Number" || schema.type=="String"))
        return [false, key, val, schema.type, `Got undefined while a string or number was expected.` ]

    return true
}

export function typeErrors(flattened): Array<{attributeName:string, actualValue:string, expectedType:string, error: string}>{

    return Object.entries( flattened)
    .filter( ([k,v]) => v[0].metadata)
    .map(([k,v]) =>  isConsistent(k,v[1], v[0]))
    .filter( (d:any) => d.length)
    .map( d => ({attributeName:d[1], actualValue:d[2], expectedType:d[3], error: d[4]}) )
}


export function mergeConfiguration<T extends Object>(
    persistentData: T, 
    newAttributes?: {[key:string]: unknown},
    ): ConfigurationStatus<T>{

    if(!newAttributes || Object.keys(newAttributes).length==0)
        return new ConsistentConfiguration<T>(persistentData, {}, persistentData)

    let mergedConfig = _.cloneDeep(persistentData)
    _.mergeWith(mergedConfig, newAttributes)

    let newConfigWithSchema =  _.cloneDeep(newAttributes)
    newConfigWithSchema.__proto__ = Object.getPrototypeOf(persistentData)
        
    let flattenedMerged = flattenSchemaWithValue(mergedConfig)

    let intrus = findIntrus("", newConfigWithSchema, persistentData)
    let missings = findIntrus("", persistentData, mergedConfig)
    let errorsType = typeErrors(flattenedMerged)
    /*
    let flattenedNew = flattenSchemaWithValue(newConfigWithSchema)
    let errorsTypeNew = typeErrors(flattenedNew)
    */
    if( errorsType.length + missings.length )
        return new UnconsistentConfiguration(persistentData, newAttributes, mergedConfig, intrus, missings, errorsType)
    
    let nonCodeIntrus = intrus.filter( (intru:string) => {
        let key = intru.split('/')[1]
        let metadata = flattenedMerged[key] && flattenedMerged[key][0] ? flattenedMerged[key][0].metadata : undefined
        if(!metadata)
            return true
        return metadata.type!="code"
    })

    if(nonCodeIntrus.length>0)
        return new ConsistentConfiguration<T>(persistentData, newAttributes,mergedConfig, intrus)
    
    return new ConsistentConfiguration<T>(persistentData, newAttributes,mergedConfig)
}

