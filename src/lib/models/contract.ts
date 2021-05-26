/**
 * ## Introduction
 * 
 * Contract is an important concept of Flux, we provide here an introduction about 
 * the motivations and the benefits. Still, this may not be a must read for a first pass
 * over the documentation (contract are optional anyway).
 * 
 * In Flux there is no limitation regarding the connection between modules:
 * any module's output can be connected to any other module's input.
 *  
 * > 🤔 It would make no sense to introduce such restriction, in particular because small 
 * > [[Adaptor | adaptors]] are often introduced to dynamically adapt messages
 * > reaching a module. 
 * 
 * It follows that the data part of a [[Message]] reaching a module's input is
 * literally **unknown**.
 * 
 * > 🧐 The following discussion address the validation of (only) the message's **data**; 
 * > a similar discussion regarding configuration validation is provided [[ mergeConfiguration | elsewhere]].
 * 
 * Contracts are introduced to both: 
 * -    overcome the difficulty of having to deal with these **unknown** data 
 * -    enable flexibility in terms of accepted incoming messages.
 * 
 * The latter point is important to keep in mind when designing modules as it allows
 * to decrease friction on modules connectivity (meaning decreasing the need of adaptors).
 * 
 * Contract formalize two mechanisms:
 * -    a mechanism to declare **pre-conditions** that need to be fulfilled before triggering the execution of a module's process
 * -    a mechanism to retrieve a **normalized** data-structure from the data part of the messages
 * 
 * More often than not, modules need similar validation/transformation schemes within 
 * variations. That's why the formalism provided to define contracts has been designed to be easily composable.
 * 
 * ### Illustrative example
 * 
 * Let's consider a module featuring one input triggering an addition between two numbers when some data comes in.
 * A naive implementation would look like this:
 * 
 * ```typescript
 * export class Module extends ModuleFlux {
 *
 *      constructor( params ){
 *          super(params) 
 * 
 *          let result$ = this.addOutput({id:'result'})
 * 
 *          this.addInput({
 *               id:'input',
 *               description: 'addition between 2 numbers',
 *               onTriggered: ({data}: {data:unknown}) 
 *                              =>  result$.next({data:data[0] + data[1]})
 *          })
 *      }
 *  } 
 *```  

 * The problem with this implementation is that it only works if the data reaching the module is an array
 * with at least 2 elements, and with a first and second element matching a number. 
 * In other cases the process execution will most likely result in an error with not much context for the 
 * consumer of the module to understand.
 * 
 * Using a contract we can start formalizing the input's expectation:
 * 
 * ```typescript
 * let numberConcept = expect({
 *      description: 'a straight Number', 
 *      when: (data) => typeof(data)=='number' 
 * })
 * 
 * export class Module extends ModuleFlux {
 *
 *      constructor( params ){
 *          super(params) 
 * 
 *          let result$ = this.addOutput({id:'result'})
 * 
 *          this.addInput({
 *               id:'input',
 *               description: 'addition between 2 numbers',
 *               contract: expectCount({count:2, when:numberConcept}),
 *               onTriggered: ({data}: {data:[number, number]})
 *                                       =>  result$.next({data:data[0] + data[1]})
 *          })
 *      }
 *  } 
 *```  
 * 
 * This updated version already provides 3 benefits : pre-conditions check, data normalization, failures reporting.
 * 
 * > #### ✅  Pre-conditions check 
 * >
 * > The above contract ensures that the addition will be triggered only if exactly 2 numbers are available in the input message.
 * > Here we use a custom **numberConcept** [[expect]] to formalize what is a number, it is composed
 * > with the [[expectCount]] function that gets fulfilled if the incoming data contains two elements for which **numberConcept**
 * > applies.
 * >
 * > #### ✅  Data normalization
 * >
 * > In case of [[FulfilledExpectation]], the triggered function gets automatically feeded by the normalized data 
 * > *in lieu of* the raw unknown one. Normalized data have a unique and predictable structure 
 * > the process implementation can rely on. In addition, because normalized data are typed, all the 
 * > benefits of a strong type system applies (in place of ```unknown``` there is now ```[number, number]```).
 * >
 * > #### ✅  Errors reporting
 * >
 * > In case of [[RejectedExpectation]], an [[ExpectationStatus]] is accessible (it is the returned value of
 * > [[IExpectation.resolve]] function) to better understand what was wrong with the data 
 * > (was it an array? did it contained not enough number? too much?)
 * >
 * >  
 * > <figure class="image" style="text-align: center; font-style: italic;">
 * >    <img src="https://raw.githubusercontent.com/youwol/flux-builder/master/images/screenshots/contract-validation-failed.png" alt="">
 * >    <figcaption>Illustration of errors reporting in the flux-builder web application.</figcaption>
 * > </figure>
 *
 * 
 * 
 * 
 * We can still improve the case study by extending the definition of *numberConcept*: 
 * we would like to handle strings that are valid representation of numbers, 
 * and also permit objects with a *value* property compatible with a number (straight or as a string).
 * 
 * ```typescript
 * let straightNumber = expect({
 *      description: 'a number', 
 *      when: (data) => typeof(data)=='number' 
 * })
 * let stringNumber = expect({
 *      description: 'a number from string',
 *      when: (data) => typeof(data)=='string' && !isNan(data), 
 *      normalizeTo: (data: string) => parseFloat(data)
 * })
 * let permissiveNumber = expectAnyOf({
 *      description: 'a permissive (leaf) number', 
 *      when:[
 *          straightNumber, 
 *          stringNumber
 *      ]
 * })
 * let numberConcept =  expectAnyOf({
 *      description: 'a permissive number', 
 *      when:[ 
 *          permissiveNumber, 
 *          expectAttribute({name:'value', when: permissiveNumber})
 *      ]
 * })
 * 
 * export class Module extends ModuleFlux {
 *
 *      constructor( params ){
 *          super(params) 
 * 
 *          let result$ = this.addOutput({id:'result'})
 *          this.addInput({
 *               id:'input',
 *               description: 'addition between 2 numbers',
 *               contract: expectCount({count:2, when:numberConcept}),
 *               onTriggered: ({data}: {data:[number, number]}) =>  result$.next({data:data[0] + data[1]})
 *          })
 *      }
 *  } 
 *```  
 * With this new implementation, the module now accepts quite a large range of input data 
 * (e.g. ``` ['1',2], [{value:1}, {value:'2'}] ``` ), and will fail 'gracefully' otherwise. 
 * Despite the number of possible combinations in terms of 
 * accepted inputs, the triggered function still get a nice and unique ```[number, number]``` parameter 🤘.
 * 
 * > The above implementation exposes small bricks of expectation that can be easily re-used elsewhere.
 * > There are already several kinds of expectations coming with the library, e.g. [[expectSome]],
 * > [[expectSingle]], [[expectCount]], [[expectAttribute]], [[expectAllOf]], [[expectAnyOf]] ...
 * > Should you want to derive your own expectation class, you need to derive from [[IExpectation]].
 * 
 * The library provide [[Contract | another layer]] above expectations to go a (last) step further. 
 * 
 * @module contract
 */

import { Context } from "./context"



/**
 * ## ExpectationStatus
 * 
 * The class ExpectationStatus is the type of the return value when an [[IExpectation | expectation]] is resolved.
 * It serves two purposes:
 * -    they can be used to present a reporting about input's contract of modules 
 * -    in case of [[FulfilledExpectation]] it includes the normalized value of the data 
 * 
 *  
 * ExpectationStatus has a tree structure, the same way expectations have (complex 'expectations' are built from combinations
 * of children expectations). 
 * 
 * See [[Contract]] for a contextual discussion about expectations, status, and normalized values.
 * 
 * @param T The type of [[FulfilledExpectation.value]], i.e. the type of the expectation return's value (normalized value) 
 * when the expectation is fulfilled
 */
export class ExpectationStatus<T>{

    /**
     * @param expectation the related expectation
     * @param children the status of *expectation* children
     * @param succeeded whether or not the expectation is fulfilled
     * @param fromValue the value (data) from which the expectation has been resolved
     * @param value the normalized value, defined only for [[FulfilledExpectation]]
     */
    constructor( 
        public readonly expectation:IExpectation<T>,
        public readonly children: Array<ExpectationStatus<unknown>> | undefined,
        public readonly succeeded: boolean,
        public readonly fromValue: unknown,
        public readonly value: T){}
}


/**
 * ## FulfilledExpectation
 * 
 * The case of a fulfilled [[ExpectationStatus]].
 * 
 * @param T The type of [[FulfilledExpectation.value]], i.e. the type of the expectation return's value (normalized value) 
 * when the expectation is fulfilled
 */
export class FulfilledExpectation<T> extends ExpectationStatus<T>{

    /**
     * @param expectation the related expectation
     * @param children the status of *expectation* children
     * @param fromValue the value (data) from which the expectation has been resolved
     * @param value the normalized value
     */
    constructor( 
        expectation: IExpectation<T>,
        value: T ,
        fromValue: unknown,
        children?: Array<ExpectationStatus<unknown>> | undefined){
            super(expectation, children, true, fromValue, value)
        }
}

/**
 * ## RejectedExpectation
 * 
 * The case of a rejected [[ExpectationStatus]].
 * 
 * @param T The type of [[FulfilledExpectation.value]], i.e. the type of the expectation return's value (normalized value) 
 * when the expectation is fulfilled
 */
export class RejectedExpectation<T> extends ExpectationStatus<T>{

    /**
     * @param expectation the related expectation
     * @param children the status of *expectation* children
     * @param fromValue the value (data) from which the expectation has been resolved
     */
    constructor( 
        expectation: IExpectation<T>,
        fromValue: unknown,
        children?: Array<ExpectationStatus<unknown>> | undefined){
            super(expectation, children, false,fromValue, undefined)
        }
}


/**
 * ## UnresolvedExpectation
 * 
 * The case of an expectation that hasn't been resolved.
 * It is the case for expectations combining children expectations in such ways that it 
 * may be unnecessary to resolve all the children to reach the outcome (e.g. [[expectAllOf]], [[expectAnyOf]])
 * 
 * @param T The type of [[FulfilledExpectation.value]], i.e. the type of the expectation return's value (normalized value) 
 * when the expectation is fulfilled
 */
export class UnresolvedExpectation<T> extends ExpectationStatus<T>{

    /**
     * @param expectation the related expectation
     * @param fromValue the value (data) from which the expectation has been resolved
     */
    constructor( 
        expectation: IExpectation<T>,
        fromValue: unknown ){
            super(expectation, undefined, false, fromValue, undefined)
        }
}


/**
 * ## IExpectation
 * 
 * Interface for all expectations. Implementing it needs:
 * -    to define a [[description]]
 * -    to implement a [[resolve]] function
 * 
 * @param T The type of [[FulfilledExpectation.value]], i.e. the type of the expectation return's value (normalized value) 
 * when the expectation is fulfilled
 */
export interface IExpectation<T> {

    /**
     * description of the expectation
     */
    readonly description: string

    /**
     * 
     * @param inputData Input data to evaluate the expectation on
     * @return Three case:
     * -    the expectation is resolved: [[FulfilledExpectation]]
     * -    the expectation is failed: [[RejectedExpectation]]
     * -    the expectation does not need to be resolved: [[UnresolvedExpectation]]
     */
    resolve(inputData: unknown, context: Context) :  ExpectationStatus<T>
}

/**
 * ## BaseExpectation
 * 
 * A simple base class for expectations that may be better suited rather than deriving directly from [[IExpectation]].
 * 
 * @param T The type of [[FulfilledExpectation.value]], i.e. the type of the expectation return's value (normalized value) 
 * when the expectation is fulfilled
 */
export class BaseExpectation<T> implements IExpectation<T> {

    /**
     * 
     * @param description description of the expectation
     * @param when defines the condition of fulfillment
     * @param normalizeTo defines how to normalize the data
     */
    constructor(
        public readonly description: string, 
        public readonly when:  BaseExpectation<T> | ((inputData) => boolean),
        public readonly normalizeTo: (accData: any, context: Context) => T = (d) => d ){
        }

    /**
     * BaseExpectation gets fulfilled if *this.when* is from *inputData*.
     * 
     * The normalized data in case of [[FulfilledExpectation]] is:
     * -    *this.when* is of type *(inputData) => boolean* => *this.normalizeTo(inputData)*
     * -    *this.when* is of type BaseExpectation => normalized value of this.when
     * 
     * @param inputData Input data to evaluate the expectation on
     * @return Expectation status from given inputData
     */
    resolve(inputData: unknown, context: Context) : ExpectationStatus<T> {
        let {succeeded, value } = this.when instanceof BaseExpectation
            ? this.when.resolve(inputData, context)
            : {succeeded:this.when(inputData), value: inputData}
        return succeeded 
            ? new FulfilledExpectation<T>(this, this.normalizeTo(value, context), inputData)
            : new RejectedExpectation(this, inputData)
    }
}


/**
 * ## Of
 * 
 * An 'elementary' expectation: it resolves a provided ```(inputData: unknown) => boolean``` function.
 * It represents the leafs of the expectation trees of [[Contract | contract]].
 * 
 * > ❕ The function [[resolve]] is generally used to construct *Of* expectation.
 * 
 * @param T The type of [[FulfilledExpectation.value]], i.e. the type of the expectation return's value (normalized value) 
 * when the expectation is fulfilled
 */
export class Of<T> extends BaseExpectation<T> {

    /**
     * 
     * @param description description of the expectation
     * @param when defines the condition of fulfillment
     * @param normalizeTo defines how to normalize the data
     */
    constructor(
        public readonly description: string, 
        public readonly when:  (inputData: unknown) => boolean,
        public readonly normalizeTo: (leafData: any, context: Context) => T = leafData => leafData ){
            super(description, when, normalizeTo)
        }

    /**
     * Resolve the expectation
     * 
     * *Of* expectation gets fulfilled if *this.when(inputData)* returns *true*,
     *  
     * The normalized data in case of [[FulfilledExpectation]] is *this.normalizeTo(inputData)*.
     * 
     * @param inputData Input data to evaluate the expectation on
     * @return Expectation status from given inputData
     */
    resolve(inputData: unknown, context: Context) : ExpectationStatus<T> {
        let succeeded = this.when(inputData)
        return succeeded 
            ? new FulfilledExpectation(this, this.normalizeTo(inputData, context), inputData)
            : new RejectedExpectation(this, inputData)
    }
}


/**
 * ## AnyOf
 * 
 * Combine a list of children expectations and gets fulfilled if at least one of the children
 * is. 
 * 
 * Children expectations beyond the first fulfilled one get associated to [[UnresolvedExpectation]]
 * (they do not need to be evaluated). 
 * 
 * The normalized data in case of [[FulfilledExpectation]] is the the result of the provided *normalizeTo* function 
 * evaluated from the first fulfilled child.
 * 
 * > ❕ The function [[expectAnyOf]] is generally used to construct *AnyOf* expectation.
 * 
 * @param T The type of [[FulfilledExpectation.value]], i.e. the type of the expectation return's value (normalized value) 
 * when the expectation is fulfilled
 */
export class AnyOf<T> extends BaseExpectation<T> {

    /**
     * @param description description of the expectation
     * @param expectations list of children expectations
     * @param normalizeTo defines how to normalize the data from one of the children
     */
    constructor( 
        description: string,
        public readonly expectations:  Array<IExpectation<T>>,
        normalizeTo: (accData: any, context: Context) => T = (accData) => accData ){
            super(description,undefined, normalizeTo)
        }

    /**
     * Resolve the expectation
     * 
     * *AnyOf* expectation gets fulfilled if at least one of its children is. 
     * 
     * Children expectations beyond the first fulfilled one get associated to [[UnresolvedExpectation]]
     * (they do not need to be evaluated). 
     * 
     * The normalized data in case of [[FulfilledExpectation]] is the the result of the provided *normalizeTo* function 
     * evaluated from the first fulfilled child.
     * 
     * @param inputData Input data to evaluate the expectation on
     * @return Expectation status from given inputData
     */
    resolve(inputData: unknown, context: Context) : ExpectationStatus<T> {

        let done = false
        let children = this.expectations.map( (expectation) => {
            if(done)
                return new UnresolvedExpectation(expectation, inputData)
            let resolved = expectation.resolve(inputData, context)
            done = resolved.succeeded
            return resolved
        })

        let resolved = children.reduce(  (acc, status ) => 
            ( acc.succeeded || !status.succeeded) ? acc : { succeeded: true, value:status.value} ,             
            {succeeded: false, value: undefined}
        )

        return resolved.succeeded 
            ? new FulfilledExpectation(this, this.normalizeTo(resolved.value, context), inputData, children)
            : new RejectedExpectation(this, inputData, children)
    }
}

/**
 * ## expectAnyOf
 * 
 * Companion creation function of [[AnyOf]].
 * 
 * @param description description of the expectation
 * @param when array of children expectations
 * @param normalizeTo normalizing function
 * @param T The type of [[FulfilledExpectation.value]], i.e. the type of the expectation return's value (normalized value) 
 * when the expectation is fulfilled
 * @returns AnyOf expectation
 */
export function expectAnyOf<T>({ description, when, normalizeTo}:
    {   description: string, 
        when:  Array<IExpectation<any>>, 
        normalizeTo?: (data: any, context: Context) => T
    }): AnyOf<T>{

    return new AnyOf<T>(description, when, normalizeTo)
}


/**
 * ## AllOf
 * =unknown
 * Combine a list of children expectations and gets fulfilled only if all the children are.
 * 
 * > ❕ The function [[expectAllOf]] is generally used to construct *AllOf* expectation.
 * 
 * @param T The type of [[FulfilledExpectation.value]], i.e. the type of the expectation return's value (normalized value) 
 * when the expectation is fulfilled
 */
export class AllOf<T> extends BaseExpectation<T> {

    /**
     * @param description description of the expectation
     * @param expectations list of children expectations
     * @param normalizeTo defines how to normalize the data from the list of children's normalized data
     */
    constructor( 
        description, 
        public readonly expectations:  Array<IExpectation<T>>,
        normalizeTo: (accData: any, context: Context) => T = (accData) => accData ){
            super(description, undefined, normalizeTo)
        }

    /**
     * Resolve the expectation
     * 
     * *AllOf* expectations gets fulfilled only if all the children expectations are. 
     * 
     * The evaluation stops at the first [[RejectedExpectation]] and children beyond that are [[UnresolvedExpectation]].
     * 
     * The normalized data in case of [[FulfilledExpectation]] is the result of the provided *normalizeTo* function 
     * evaluated from the list of the normalized data returned by each children.
     * 
     * @param inputData Input data to evaluate the expectation on
     * @return Expectation status from given inputData
     */
    resolve(inputData: unknown, context: Context) : ExpectationStatus<T> {

        let done = false
        let children = this.expectations.map( (expectation) => {
            if(done)
                return new UnresolvedExpectation(expectation, inputData)
            let resolved = expectation.resolve(inputData, context)
            done = !resolved.succeeded
            return resolved
        })
        let resolveds = children.reduce( ( acc, status ) => {
            if(!acc.succeeded)
                return acc
                
            return { 
                succeeded: acc.succeeded && status.succeeded, 
                elems: status.succeeded ? acc.elems.concat([status.value]) : acc.elems
            }
            }, { succeeded:true, elems:[] }
        )
        return resolveds.succeeded 
            ? new FulfilledExpectation(this, this.normalizeTo(resolveds.elems, context), inputData, children)
            : new RejectedExpectation(this, inputData, children)
    }
}

/**
 * ## expectAllOf
 * 
 * Companion creation function of [[AllOf]].
 * 
 * @param description description of the expectation
 * @param when array of children expectations
 * @param normalizeTo normalizing function
 * @param T The type of [[FulfilledExpectation.value]], i.e. the type of the expectation return's value (normalized value) 
 * when the expectation is fulfilled
 * @returns AllOf expectation
 */
export function expectAllOf<T>( {description, when, normalizeTo}: 
    {   
        description: string, 
        when:  Array<IExpectation<T>>, 
        normalizeTo?: (accData: Array<any> ) => T
    }): AllOf<T>{

    return new AllOf<T>(description, when, normalizeTo)
}


/**
 * ## OptionalsOf
 * 
 * Expectation used to describe optionals values - always fulfilled. 
 * 
 * @param T The type of [[FulfilledExpectation.value]], i.e. the type of the expectation return's value (normalized value) 
 * when the expectation is fulfilled
 */
export class OptionalsOf<T> extends BaseExpectation<T> {

    /**
     * @param description description of the expectation
     * @param expectations list of children expectations
     * @param normalizeTo defines how to normalize the data from the list of children's normalized data
     */
    constructor( 
        description, 
        public readonly expectations:  Array<IExpectation<T>>,
        normalizeTo: (accData: any) => T = (accData) => accData ){
            super(description, undefined, normalizeTo)
        }

     /**
     * Resolve the expectation
     * 
     * OptionalsOf are always [[FulfilledExpectation]], even if some of its children are [[RejectedExpectation]].
     * 
     * The evaluation always go through all the children (no [[UnresolvedExpectation]]).
     * 
     * The normalized data is the result of the provided *normalizeTo* function 
     * evaluated from the list of the normalized data returned by each children.
     * 
     * @param inputData Input data to evaluate the expectation on
     * @return the [[FulfilledExpectation]]
     */
    resolve(inputData: unknown, context: Context) : ExpectationStatus<T> {

        let children = this.expectations.map( (expectation) => expectation.resolve(inputData, context))
        let resolveds = children.reduce( ( acc, status ) => acc.concat([status.value]), [] )
        return new FulfilledExpectation(this, this.normalizeTo(resolveds, context), inputData, children)
    }
}
    }
}


/**
 * ## ExpectAttribute
 * 
 * Apply an [[expectation]] on a target attribute [[attName]].
 * 
 * > ❕ The function [[expectAttribute]] is generally used to construct *ExpectAttribute* expectation.
 * 
 * @param T The type of [[FulfilledExpectation.value]], i.e. the type of the expectation return's value (normalized value) 
 * when the expectation is fulfilled
 */
export class ExpectAttribute<T> extends BaseExpectation<T> {


    /**
     * @param attName target attribute name
     * @param expectation expectation on the attribute
     * @param normalizeTo defines how to normalize the *expectation* resolved value.
     */
    constructor( 
        public readonly attName: string, 
        public readonly expectation: IExpectation<T>, 
        normalizeTo: (accData: any) => T = accData => accData 
        ){
        super( `expect attribute ${attName}`,undefined, normalizeTo)
    }

    /**
     * Resolve the expectation
     * 
     * The expectation get fulfilled if both: (i) the attribute [[attName]] exist in the inputData,
     * and (ii) [[expectation]] resolve to [[FulfilledExpectation]] when applied on *inputData[attName]*.
     * 
     * If the [[attName]] do not exist in the inputData, [[expectation]] is not evaluated.
     * 
     * The normalized data is the result of the provided *normalizeTo* function 
     * evaluated from *this.expectation.resolve(inputData[attName])*.
     * 
     * @param inputData Input data to evaluate the expectation on
     * @return Expectation status from given inputData
     */
    resolve(inputData: unknown, context: Context) : ExpectationStatus<T> {

        if(inputData[this.attName] == undefined)
            return new RejectedExpectation(this, inputData)

        let resolved = this.expectation.resolve(inputData[this.attName], context)
        return resolved.succeeded 
            ? new FulfilledExpectation(this, this.normalizeTo(resolved.value, context), inputData, [resolved])
            : new RejectedExpectation(this, inputData, [resolved])
    }
}


/**
 * ## expectAttribute
 * 
 * Companion creation function of [[ExpectAttribute]].
 * 
 * @param name name of the attribute
 * @param when expectation to test on the target attribute
 * @param T The type of [[FulfilledExpectation.value]], i.e. the type of the expectation return's value (normalized value) 
 * when the expectation is fulfilled
 * @returns ExpectAttribute expectation
 */
export function expectAttribute<T>( {name, when}: 
    {
        name: string, 
        when: IExpectation<T>
    }): ExpectAttribute<T>{

    return new ExpectAttribute<T>(name, when)
}



/**
 * ## OfFree
 * 
 * Expect nothing (always fulfilled) and do not apply any data normalization (directly return the inputData).
 * 
 * > 😕 This can be used for quick prototyping of module's input in order to postponed the design of the contract 
 * > to latter.
 */
export class OfFree implements IExpectation<unknown>{

    description = "No expectation"
    constructor(){}

    /**
     * 
     * @param inputData Input data to evaluate the expectation on
     * @returns *FulfilledExpectation<unknown>(this, inputData, inputData, [])*
     */
    resolve( inputData: unknown ) :  ExpectationStatus<unknown>  {
        return new FulfilledExpectation<unknown>(this, inputData, inputData, [])
    }
}

/**
 * ## expectNothing
 * 
 * Companion creation function of [[NoExpectation]]
 * 
 * @returns an expectation that expects nothing and to do not apply any data normalization
 */
export function expectFree() : OfFree{
    return new OfFree()
}


export let freeContract = expectFree


/**
 * ## expectInstanceOf
 * 
 * The function expectInstanceOf aims at ensuring that at least one element of target
 * instance type exists in input data.
 * 
 * The expectation get fulfilled if any of the following get fulfilled: 
 * -    the inputData is an instance of *Type*
 * -    the inputData have an attribute in *attNames* that is an instance of *Type*
 * 
 * In that case, the normalized data is the instance of *Type* retrieved.
 * 
 * @param typeName display name of the type
 * @param Type the target type 
 * @param attNames candidate attribute names 
 * @returns BaseExpectation that resolve eventually to a type T
 */
export function expectInstanceOf<T>({ typeName, Type, attNames}:
    {   typeName: string, 
        Type, 
        attNames?: Array<string> 
    }): BaseExpectation<T>{
    
    attNames = attNames || []
    let when = expect<T>({
        description: `direct instance of ${typeName}`,
        when: (d) => d instanceof Type
    })

    let attExpectations = attNames.map( (name) => expectAttribute({name, when}))
    
    return expectAnyOf<T>({
        description: `a direct instance of ${typeName}, or such instance in attributes ${attNames}`,
        when:[  when, ...attExpectations ]
     })
}

/**
 * ## expectCount
 * 
 * The function expectCount aims at ensuring that exactly *count* elements in some *inputData* 
 * are fulfilled with respect to a given expectation.
 * 
 * The expectation get fulfilled if both: 
 * -    (i) the inputData is an array
 * -    (ii) there exist exactly *count* elements in the array that verifies *when* 
 * 
 * In that case, the normalized data is an array containing the normalized data of the elements fulfilled.
 * (of length *count*)
 * 
 * @param count the expected count 
 * @param when the expectation 
 * @returns BaseExpectation that resolve eventually to a type T[] of length *count*
 */
export function expectCount<T>({count, when}:
    {
        count: number, 
        when: IExpectation<T>
    }): BaseExpectation<T[]>{

    return expectAllOf<T[]>({
        description: `expect ${count} of "${when.description}"`,
        when: [
            expect({
                description:'an array',
                when: (d) => Array.isArray(d),
            }),
            expect({
                description:'2 numbers',
                when: (elems: Array<any>) => {
                    return elems.filter( d => when.resolve(d).succeeded ).length == count
                },
                normalizeTo: (elems: Array<any>) => {
                    return elems
                    .map( d => when.resolve(d))
                    .filter( d => d.succeeded)
                    .map( d => d.value)
                },
            })
        ],
        normalizeTo: (d) => d[1]
    }) as BaseExpectation<T[]>
}


/**
 * ## expectSingle
 * 
 * The function expectSingle aims at ensuring that exactly one element in some *inputData* 
 * is fulfilled with respect to a given expectation.
 * 
 * The expectation get fulfilled if either: 
 * -    (i) *when.resolve(inputData)* is fulfilled 
 * -    (ii) inputData is an array that contains exactly one element for which *when* resolve to [[FulfilledExpectation]]
 * 
 * In that case, the normalized data identifies to the one of the *when* expectation.
 * 
 * @param count the expected count 
 * @param when the expectation 
 * @returns BaseExpectation that resolve eventually to a type T[] of length *count*
 */
export function expectSingle<T>({when}:{when: IExpectation<T>}){

    return expectAnyOf<T>({
        description: `expect single of "${when.description}"`,
        when: [          
            expect({
                description:`an element "${when.description}"`,
                when: (d) => when.resolve(d).succeeded
            }),
            expectAllOf<any>({
                description:`an array with exactly one element "${when.description}"`,
                when: 
                [
                    expect({
                        description:'an array',
                        when: (d) => Array.isArray(d),
                    }),
                    expect({
                        description:`the array includes a single element "${when.description}"`,
                        when: (elems: Array<unknown>) => elems.filter( d => when.resolve(d).succeeded ).length == 1,
                        normalizeTo: (elems: Array<unknown>) =>  when.resolve( elems.find( d => when.resolve(d).succeeded ) ).value
                    }),
                ],
                normalizeTo: (d) => d[1]
            })
        ]
    }) as BaseExpectation<T>
}


/**
 * ## expectSome
 * 
 * The function expectSome aims at ensuring that it exist at least one elements in some *inputData* 
 * that are fulfilled with respect to a given expectation.
 * 
 * The expectation get fulfilled if either: 
 * -    (i) *when.resolve(inputData)* is fulfilled 
 * -    (ii) inputData is an array that contains at least one element that verifies *when* 
 * 
 * In that case, the normalized data is an array containing the normalized data of the elements fulfilled.
 * 
 * @param when the expectation 
 * @returns BaseExpectation that resolve eventually to a type T[]
 */
export function expectSome<T>({when}:{when: IExpectation<T>}){

    return expectAnyOf<T[]>({
        description:  `some of "${when.description}"`,
        when: [
            expect({
                description:`an element "${when.description}"`,
                when: (d) => when.resolve(d).succeeded,
                normalizeTo: (d) => [d]
            }),
            expectAllOf<any>({
                description:`an array with element(s) "${when.description}"`,
                when: [
                    expect({
                        description:'an array',
                        when: (d) => Array.isArray(d),
                    }),
                    expect({
                        description:`the array includes some element(s) "${when.description}"`,
                        when: (elems: Array<unknown>) => {
                            return elems.filter( d => when.resolve(d).succeeded ).length > 0
                        },
                        normalizeTo: (elems: Array<unknown>) => {
                            return elems
                            .map( d => when.resolve(d))
                            .filter( d => d.succeeded)
                            .map( d => d.value)
                        },
                    })
                ],
                normalizeTo: (d) => d[1]
            })
        ]
    }) as BaseExpectation<T[]>
}


/**
 * ## expect
 * 
 * Generic expectation creator, companion creation function of [[BaseExpectation]].
 * 
 * @param description expectation's description 
 * @param when either a condition that returns true if the expectation is fulfilled
 * or an expectation 
 * @param normalizeTo normalizing function for fulfilled case 
 * @returns BaseExpectation that resolve eventually to a type T
 */
export function expect<T>(
    {description, when, normalizeTo} : 
    {   
        description: string, 
        when: ((inputData: any) => boolean) | IExpectation<any>, 
        normalizeTo?: (data: any, ctx: Context) => T
    }): BaseExpectation<T>{

    if(when instanceof BaseExpectation)
        return new BaseExpectation<T>(description, when, normalizeTo)

    return new Of<T>(description, when as any, normalizeTo)
}



/**
 * ## Contract
 * 
 * 
 * The objects Contract are an expectation that gather multiple expectations 😵.
 * 
 * > For 'simple' cases you may not need a Contract, sticking with the functions *expect\** like in the examples 
 * > provided [[contract | here]] is totally fine.
 * > This Contract class will help to go a bit further, in particular in terms of formalizing required & optionals expectations.
 * 
 * Let consider the following example (and assume Material, Mesh, Option1, Option2 are known classes):
 * 
 * ```typescript
 * // the next line is to avoid to write an expect statement for each and every types.
 * let expectInstanceOf = ( T, attName ) => {
 *      let isInstance = expect({when: (d) => d instanceof T})
 *      return expectAnyOf( {when:[
 *          isInstance,
 *          expectAttribute({name:attName, when: isInstance})
 *      ]
 * })
 * 
 * let contract = contract({
 *       requireds: {   
 *           mat:expectSingle<Material>({when: expectInstanceOf(Material, 'material' ) }), 
 *           meshes:expectCount<Mesh>({count: 2, when:  expectInstanceOf(Mesh, 'mesh')}), 
 *       },
 *       optionals: {
 *           options1 : expectSingle<Option1>({when: expectInstanceOf(Option1, 'option')})
 *       }
 *   })
 * ```
 * 
 * Using this contract in an input will ensure we always get the following normalized 
 * data-structure in the triggered callback:
 * 
 * ```
 * type dataType = {
 *      mat: Material,
 *      meshes: [Mesh, Mesh],
 *      options1: Option1 | undefined,
 * }
 * ```
 */ 
export class Contract implements IExpectation<unknown>{

    /*
     * @param description expectation's description 
     * @param requireds set of required expectations provided as a mapping using a given name 
     * @param optionals set of optionals expectations provided as a mapping using a given name 
     */
    constructor(
        public readonly description: string,
        public readonly requireds: { [key:string]:IExpectation<unknown>},
        public readonly optionals: { [key:string]:IExpectation<unknown>} = {}
    ){
    }

    /**
     * Resolve the expectation
     * 
     * The expectation get fulfilled if all the [[requireds]] expectations are. 
     *  
     * The normalized data is provided as dictionary *{[key:string]: normalizedData(key)}* where
     * *key* reference the keys in [[requireds]] + [[optionals]] and *normalizedData(key)*
     * the normalize data of the associated expectation.
     * 
     * The class documentation provide an example of use.
     * 
     * @param inputData Input data to evaluate the expectation on
     * @return Expectation status from given inputData, either [[FulfilledExpectation]] or [[RejectedExpectation]]
     */
    resolve( data: unknown, context: Context ) :  ExpectationStatus<{ [key:string]:unknown}>  {

        let requiredStatus = (new AllOf<any>('requireds', Object.values(this.requireds))).resolve(data, context)
        let optionalStatus = (new OptionalsOf<any>('optionals', Object.values(this.optionals))).resolve(data, context)

        let valuesRequired = requiredStatus.succeeded
            ? Object.entries(this.requireds).reduce( (acc,[k,v],i) => {
                return{...acc, ...{[k]:requiredStatus.value[i]}}
            }, {})
            : {}
        let valuesOptional = Object.entries(this.optionals).reduce( (acc,[k,v],i) => {
            return{...acc, ...{[k]:optionalStatus.value[i]}}
        }, {})
        let values = {...valuesRequired, ...valuesOptional}

        return requiredStatus.succeeded 
            ? new FulfilledExpectation(this, values, data, [requiredStatus, optionalStatus])
            : new RejectedExpectation(this, data, [requiredStatus, optionalStatus])
    }
}

/**
 * ## contract
 * 
 * Companion creation function of [[Contract]].
 * 
 * @param description expectation's description 
 * @param requireds set of required expectations provided as a mapping using a given name 
 * @param optionals set of optionals expectations provided as a mapping using a given name 
 * @returns Contract
 */
export function contract(
    {description, requireds, optionals}: 
    {
        description: string, 
        requireds: { [key:string]:IExpectation<unknown>}, 
        optionals?: { [key:string]:IExpectation<unknown>}
    }
    ): Contract  {

    return new Contract(description,requireds, optionals)
}
