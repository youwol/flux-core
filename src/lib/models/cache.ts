/**
 * 
 * ## Cache
 * 
 * ### Introduction
 * 
 * The Cache class can be used by the modules realizing heavy computations
 * to reuse some results that can not have changed from one run to another.
 * 
 * This scenario is actually quite common, and the immutable nature 
 * of the data produced by the modules makes it easy to manage (and safe 😷).
 * 
 * Here is an hypothetical scenario illustrating the discussion:
 * ```
 *             physicalMdle 
 *                          \
 *                           combineMdle-->simulatorMdle-->viewerMdle
 *                          /
 *  sliderMdle-->solverMdle
 * ```
 * 
 * In the above workflow:
 * -    the central module is the **simulatorMdle**, it takes a *physicalModel* and a *solverModel* as input 
 * to realize a simulation. To actually do the simulation, it computes an intermediate result relying
 * only on the *physicalModel*, this computation is actually the bottleneck in terms of performance -
 * e.g. it can take a couple of seconds.
 * -    the **solverMdle** returns a *solverModel*, it somehow relies on the value of some parameters
 * provided by a **sliderMdle** (the user is expected to aggressively move from left to right 😈).
 * -    the **physicalMdle** emit a *physicalModel*, it has been tuned at 'building time' (there is only
 * one version of it emitted as it is not connected to some inputs)
 * -    the **combineMdle** emit a new message [*solverModel*, *physicalModel*] with their latest 
 * version available each time one of its input receive a new value (in this case it will always be
 * from the bottom path)
 * -    the **viewerMdle** somehow displays the result of the simulation
 * 
 * If this scenario is handled naively:
 * 
 * **sliderMdle** emit a new value -> **solverMdle** emit a new *solverModel* ->**combineMdle** emit a join with this newly created *solverModel* 
 * with the existing *physicalModel* -> **simulatorMdle** takes a couple of seconds to emit the simulation result -> 
 * **viewerMdle** display the results.
 * 
 * Our final user will be frustrated because he was expecting to get instant feedback on the result while 
 * aggressively moving the slider 🤬.
 * 
 * This is unfortunate because the bottleneck in terms of performance of the computation relies only on the *physicalModel* 
 * and this one not only did not changed in terms of its content, but it is actually exactly the same object 
 * (same reference, the **combinerMdle** just used the *physicalModel* already available each time a new *solverModel*
 * was coming in). 
 * 
 * > 🤯 Thanks to immutability, equality on references at different times guaranty that no properties
 * > of the object has been modified.
 * > It is very important for Flux and its 'functional' approach as it provides a straightforward way to safely (and immediately)
 * > retrieve existing intermediate results of computations from references, even for complex & large data-structures.
 * 
 * In the scenario depicted above, by caching the intermediate result against the reference of the *physicalModel*, 
 * the **simulatorMdle** can actually immediately retrieves the right intermediate result rather than having to 
 * redo the computations. This will makes our slider-aggressive user happy 🤩 as the time consuming step of 
 * the computation has been removed and he can hopefully get a responsive experience while looking at the viewer. 
 * 
 * The nature of Flux applications, driven by events and with a common use of flow combination type of modules, 
 * end up of having such opportunities of (aggressive) optimizations actually quite often. 
 * It takes a bit more work for the developer to handle it, the Cache store has been designed
 * to facilitate this work.
 * 
 * ### Usage of the cache store in the modules
 * 
 * Let's try to implement a skeleton of the **simulatorMdle** of the above example:
 * 
 * ```typescript
 * 
 * class PhysicalModel{...}
 * class SolverModel{...}
 * 
 * let contract = contract({
 *      description: 'expect to retrieve physical & solver models',
 *      requireds:{ 
 *          physModel: expectInstanceOf(PhysicalModel, ['physicalModel', 'physModel']),
 *          solverModel: expectInstanceOf(SolverModel, ['solverModel']) 
 *     }
 * })
 * export class Module extends ModuleFlux {
 *
 *      result$ : Pipe<number>
 *
 *       constructor( params ){
 *          super(params) 
 *
 *          this.addInput({
 *               contract,
 *               onTriggered: ({data, configuration, context}, {cache: Cache}) => 
 *                  this.simulate(data, context, cache)
 *           })
 *          this.result$ = this.addOutput()
 *      }
 * 
 *      simulate( 
 *          data: {physModel, solverModel}: {physModel: PhysicalModel, solverModel: SolverModel},
 *          context: Context,
 *          cache: Cache ) {
 *
 *          cache.getOrCreate$( 
 *              new ReferenceKey('physModel', physModel),
 *              () => this.longComputation(physModel)
 *          ).subscribe( (intermediateResult) => {
 *              let result = intermediateResult / fastComputation(solverModel) 
 *              this.result$.next({data:result,context})
 *              context.close()
 *          })
 *       }
 * 
 *      longComputation(physModel: PhysicalModel): Observable<number>{
 *          // a long and hard computation...
 *          return of(42).pipe(delay(2))
 *      }
 * 
 *      fastComputation(solverModel: SolverModel): number{
 *          // a fast computation...
 *          return 42
 *      }
 *  }
 * 
``` 
 * @module cache
 */
import { Observable, of } from "rxjs"
import { map, tap } from "rxjs/operators"
import { Context } from "./context"



/**
 * ## CacheKey
 * 
 * Interface for keys that can be used in the [[Cache]], see [[ReferenceKey]] or [[ValueKey]].
 * 
 * Inheriting classes must define a comparison operator [[isSame]].
 * 
 * The *name* is provided by the consumer when creating the key, it is usually used 
 * as precondition in the implementation of *isSame*.
 */
interface CacheKey {

    /**
     * name of the key
     */
    name: string

    /**
     * @param rhsKey the key to compare to  
     */
    isSame(rhsKey): boolean
}


/**
 * ## ReferenceKey
 * 
 * Type of [[CacheKey | key]] that can be used in the [[Cache]] relying on references equality.
 * 
 */
export class ReferenceKey implements CacheKey {

    private readonly objects: Array<Object>

    /**
     * 
     * @param name name of the key
     * @param objects list of all references to match for [[isSame]] to return true
     */
    constructor(public readonly name: string, ...objects: Array<Object>) {
        this.objects = objects
    }

    /**
     * 
     * @param key 
     * @returns true if the names are the same as well as all objects' reference (in the same order)
     */
    isSame(key: ReferenceKey) : boolean {
        if(this.name != key.name)
            return false
        let equalities = this.objects.map((v, i) => v == key.objects[i])
        return equalities.find(isSame => !isSame) == undefined
    }
}

/**
 * ## ValueKey
 * 
 * Type of [[CacheKey | key]] that can be used in the [[Cache]] relying on deep equality.
 */
export class ValueKey implements CacheKey {
    
    private keyStr: string

    /**
     * 
     * @param name name of the key
     * @param value target value, should be JSON.stringify-able
     */
    constructor(public readonly name: string, public readonly value) {
        this.keyStr = JSON.stringify(this.value)
    }

    /**
     * 
     * @param key 
     * @returns true if the names are the same && deep equality on their values
     */
    isSame(key: ValueKey): boolean {      
        return this.name === key.name && this.keyStr === key.keyStr
    }
}

/**
 * ## Cache
 * 
 * The class Cache represents as store of values that can be retrieves from 
 * keys.
 * 
 * There are two kind of keys:
 * -    [[ValueKey]]: equality of keys are based on value  
 * -    [[ReferenceKey]]: equality of keys are based on reference(s)  
 * 
 * Usage of [[ReferenceKey]] should be preferred whenever possible (it does not involves serialization).
 * In practice:
 * -    when the key is based on values contains in the **data** part of a [[Message | message]],
 * [[ReferenceKey]] are used.
 * -    when the key is based on values contains in the **configuration** part of a [[Message | message]],
 * [[ValueKey]] are used (due to the step of [[mergeConfiguration]], modules always receive new instances
 * of configuration).
 * 
 * Every [[ModuleFlux | module]] contains an instance of this class,
 * it is provided as second argument of an input's *onTriggered* callback.
 * 
 */
export class Cache {


    private maxCount = 1
    private cachedObjects = new Array<[CacheKey, unknown]>()

    constructor() { }

    /**
     * Set the maximum number of items of the store
     * 
     * @param count maximum number of items
     */
    setCapacity(count: number){
        this.maxCount = count
    }

    /**
     * Get a value from the cache or generate it if not available.
     * Synchronous version.
     * 
     * @param key [[ValueKey]] or [[ReferenceKey]]
     * @param creatorFct value generator
     * @param context execution context, if provided:
     * -    if the value is created: a child context is appended to it and passed to the generator function
     * -    if the value is retrieved: a [[LogInfo]] entry is appended to it
     * @returns the value, either retrieved or created
     */
     getOrCreate<TValue>(key: CacheKey, creatorFct: (context?: Context) => TValue, context?: Context) : TValue{
        return this.getOrCreateWithStatus(key, creatorFct, context)[0]
    }


    /**
     * Get a value from the cache or generate it if not available.
     * Asynchronous version.
     * 
     * @param key [[ValueKey]] or [[ReferenceKey]]
     * @param creatorFct value generator     
     * @param context execution context, if provided:
     * -    if the value is created: a child context is appended to it and passed to the generator function
     * -    if the value is retrieved: a [[LogInfo]] entry is appended to it
     * @returns Observable on value, either retrieved or created
     */
     getOrCreate$<T>(key: CacheKey, creatorFct$: (context?: Context) => Observable<T>, context?: Context) : Observable<T> {
        
        return this.getOrCreateWithStatus$(key, creatorFct$, context).pipe(
            map( ([v,_]) => v)
        )
    }
        

    /**
     * Get a value from the cache or generate it if not available.
     * Synchronous version.
     * 
     * @param key [[ValueKey]] or [[ReferenceKey]]
     * @param creatorFct value generator    
     * @param context execution context, if provided:
     * -    if the value is created: a child context is appended to it and passed to the generator function
     * -    if the value is retrieved: a [[LogInfo]] entry is appended to it
     * @returns [value, fromCache], value: the value (either retrieved or created), fromCache: true if the value was in the cache
     */
    getOrCreateWithStatus<TKey, TValue>(key: CacheKey, creatorFct: (context?: Context) => TValue, context?: Context) : [TValue, boolean]{

        let cached = this.getCached(key)
        if(cached){
            context && context.info(`Cache -> ${key.name}: Value retrieved from cache`, cached[1])
            return [cached[1], true]
        }
        let value = context 
            ? context.withChild( `Cache -> ${key.name}: Value creation` , (ctx) => creatorFct(ctx) )
            : creatorFct()
        
        this.postProcess(key, value)
        
        return [value, false]
    }

    /**
     * Get a value from the cache or generate it if not available.
     * Asynchronous version.
     * 
     * @param key [[ValueKey]] or [[ReferenceKey]]
     * @param creatorFct value generator
     * @param context execution context, if provided:
     * -    if the value is created: a child context is appended to it and passed to the generator function
     * -    if the value is retrieved: a [[LogInfo]] entry is appended to it
     * @returns Observable on [value, fromCache], value: the value (either retrieved or created), fromCache: true if the value was in the cache
     */
    getOrCreateWithStatus$<T>(key: CacheKey, creatorFct$: (context?: Context) => Observable<T>, context?: Context) : Observable<[T, boolean]> {
        
        let cached = this.getCached(key)
        if(cached){
            context && context.info(`Cache -> ${key.name}: Value retrieved from cache`, cached[1])
            return of([cached[1], true])
        }
        let ctx = context
            ? context.startChild(`Cache -> ${key.name}: Value creation`)
            : undefined
         
        return creatorFct$(ctx).pipe(
            tap( (obj: T) =>{
                ctx.end()
                this.postProcess(key, obj) 
            }),
            map( (obj) => [obj, false])
        )
    }


    private postProcess<TObj>( key: CacheKey, obj: TObj ) : TObj {

        if (this.maxCount == 1 && this.cachedObjects.length == 1) {
            this.cachedObjects[0] = [key, obj]
            return obj
        }
        this.cachedObjects.push([key, obj])

        if (this.cachedObjects.length > this.maxCount)
             this.cachedObjects.slice(1)

        return obj
    }

    private getCached(key: CacheKey): unknown | undefined{
        return this.cachedObjects.find(([k, v]) => k.isSame(key as ValueKey))
    }
    
}
