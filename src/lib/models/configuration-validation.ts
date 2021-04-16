import { flattenSchemaWithValue } from "./decorators"
import * as _ from 'lodash'


/**
 * ## ConfigurationStatus
 * 
 * Base class for both [[ConsistentConfiguration]] and [[InconsistentConfiguration]].
 * 
 * It is the returned value of the function [[mergeConfiguration]].
 * 
 * @param T type of the module's PersistentData 
 */
export class ConfigurationStatus<T>{

    /**
     * 
     * @param original static persistent data (e.g. in Flux applications: the one defined from the settings panel of the module)
     * @param newAttributes the attributes that have been requested to be updated (e.g. those returned in the configuration part
     * returned by an adaptor)
     * @param result the result of merging *original* with *newAttributes*
     * @param intrus a list of intrus: fields in *newAttributes* that are actually not part of the original persistent data.
     * The values of the array are the path to the attributes.
     */
    constructor(
        public readonly original: T, 
        public readonly newAttributes, 
        public readonly result: T, 
        public readonly intrus: Array<string> = []
        ){}
}

/**
 * ## ConsistentConfiguration
 * 
 * The case of a successful [[mergeConfiguration]]: no errors, eventually some intrus.
 * 
 * Intrus are the fields in *newAttributes* that are actually not part of the *original* data structure.
 */
export class ConsistentConfiguration<T> extends ConfigurationStatus<T>{

    /**
     * 
     * @param original static persistent data (in Flux: the one defined in the settings panel of the module)
     * @param newAttributes the attributes that have been requested to be updated (e.g. those returned in the configuration part
     * returned by an adaptor)
     * @param result the result of merging *original* with *newAttributes*
     * @param intrus a list of intrus: fields in *newAttributes* that are actually not part of the *original* data structure.
     * The values of the array are the path to the attributes.
     */
    constructor( 
        original: T, 
        newAttributes,
        result: T,
        intrus: Array<string> = []){
            super(original, newAttributes, result, intrus)
        }
}

/**
 * ## InconsistentConfiguration
 * 
 * The case of a failed [[mergeConfiguration]]: merging errors exist and eventually some intrus.
 * 
 * Intrus are the fields in *newAttributes* that are actually not part of the *original* data structure.
 * 
 * Errors can arise in two cases:
 * -    when an attributes in *newAttributes* exist in the *original* data structure
 * but types do not align.
 * -    when some attributes in the *original* data structure disappear because of the merge
 * 
 */
export class InconsistentConfiguration<T> extends ConfigurationStatus<T>{

    /**
     * 
     * @param original static persistent data (in Flux: the one defined in the settings panel of the module)
     * @param newAttributes the attributes that have been requested to be updated (e.g. those returned in the configuration part
     * returned by an adaptor)
     * @param result the result of merging *original* with *newAttributes*
     * @param intrus a list of intrus: fields in *newAttributes* that are actually not part of the persistent data.
     * The values of the array are the path to the attributes.
     * @param missings a list of missing attributes in *result*, the values of the array are the path to these attributes.
     * @param typeErrors the description of the errors
     */
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

/**
 * 
 * @Hidden
 */
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

/**
 * 
 * @Hidden
 */
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

/**
 * 
 * @Hidden
 */
export function typeErrors(flattened): Array<{attributeName:string, actualValue:string, expectedType:string, error: string}>{

    return Object.entries( flattened)
    .filter( ([k,v]) => v[0].metadata)
    .map(([k,v]) =>  isConsistent(k,v[1], v[0]))
    .filter( (d:any) => d.length)
    .map( d => ({attributeName:d[1], actualValue:d[2], expectedType:d[3], error: d[4]}) )
}

/**
 * ## mergeConfiguration
 * 
 * The function mergeConfiguration is in charge to provide the **dynamic configuration**
 * to module's processing functions as well as to provide the description of eventual errors/intrus.
 * 
 * The **dynamic configuration** is obtained by merging the **static configuration**
 * (the one constructed from [[ModuleConfiguration]]) with eventual dynamic values -
 * e.g. those provided by the configuration returned by an [[Adaptor]].
 *  
 * Errors can arise in two cases:
 * -    when an attributes in *newAttributes* exist in the *original* data structure
 * but types do not align.
 * -    when some attributes in the *original* data structure disappear because of the merge
 * 
 * Intrus are the fields in *newAttributes* that are actually not part of the *original* data structure.
 * 
 * > ❕ The *persistentData* provided as argument to the function should have been decorated 
 * > using [[Schema]] and [[Property]] at construction.
 * 
 * @param persistentData persistent data of the module ([[ModuleFlux.getPersistentData]])
 * @param newAttributes dynamic attributes - e.g. the configuration part returned by an adaptor
 * @returns status of the result, either a [[ConsistentConfiguration]] or a [[InconsistentConfiguration]]
 */
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
        return new InconsistentConfiguration(persistentData, newAttributes, mergedConfig, intrus, missings, errorsType)
    
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

