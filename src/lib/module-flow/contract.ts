

export class ExpectationStatus<T>{

    constructor( 
        public readonly expectation:IExpectation<T>,
        public readonly children: Array<ExpectationStatus<T>> | undefined,
        public readonly succeeded: boolean,
        public readonly value: T ){}
}

export class FullfiledExpectation<T> extends ExpectationStatus<T>{

    constructor( 
        expectation: IExpectation<T>,
        value: T ,
        children?: Array<ExpectationStatus<T>> | undefined){
            super(expectation, children, true, value)
        }
}
export class RejectedExpectation<T> extends ExpectationStatus<T>{

    constructor( 
        expectation: IExpectation<T>,
        children?: Array<ExpectationStatus<T>> | undefined){
            super(expectation, children, false, undefined)
        }
}
export class UnresolvedExpectation<T> extends ExpectationStatus<T>{

    constructor( 
        expectation: IExpectation<T>){
            super(expectation, undefined, false, undefined)
        }
}


export class ScenarioReport<T>{

    constructor(
        public readonly description: string, 
        public readonly resolution:  ExpectationStatus<T>, 
        public readonly children?: Array<ScenarioReport<any>>){}
}

export interface IExpectation<T> {

    readonly description: string

    resolve(inputData) :  ExpectationStatus<T>
}

export class BaseExpectation<T> implements IExpectation<T> {

    constructor(
        public readonly description: string, 
        public readonly when:  BaseExpectation<T> | ((inputData) => boolean),
        public readonly mapTo: (accData: any) => T = (d) => d ){
        }

    resolve(inputData: any) : ExpectationStatus<T> {
        let {succeeded, value } = this.when instanceof BaseExpectation
            ? this.when.resolve(inputData)
            : {succeeded:this.when(inputData), value: inputData}
        return succeeded 
            ? new FullfiledExpectation(this, this.mapTo(value))
            : new RejectedExpectation(this)
    }
}


export class Of<T> extends BaseExpectation<T> {

    constructor(
        public readonly description: string, 
        public readonly when:  (inputData: any) => boolean,
        public readonly mapTo: (leafData: any) => T = leafData => leafData ){
            super(description, when, mapTo)
        }

    resolve(inputData: any) : ExpectationStatus<T> {
        let succeeded = this.when(inputData)
        return succeeded 
            ? new FullfiledExpectation(this, this.mapTo(inputData))
            : new RejectedExpectation(this)
    }
}

export class AnyOf<T> extends BaseExpectation<T> {

    constructor( 
        description: string,
        public readonly expectations:  Array<IExpectation<T>>,
        mapTo: (accData: any) => T = (accData) => accData ){
            super(description,undefined, mapTo)
        }

    resolve(inputData: any) : ExpectationStatus<T> {

        let done = false
        let children = this.expectations.map( (expectation) => {
            if(done)
                return new UnresolvedExpectation(expectation)
            let resolved = expectation.resolve(inputData)
            done = resolved.succeeded
            return resolved
        })

        let resolved = children.reduce(  (acc, status ) => 
            ( acc.succeeded || !status.succeeded) ? acc : { succeeded: true, value:status.value} ,             
            {succeeded: false, value: undefined}
        )

        return resolved.succeeded 
            ? new FullfiledExpectation(this, this.mapTo(resolved.value), children)
            : new RejectedExpectation(this, children)
    }
}

export function expectAnyOf<T>({ description, when, mapTo}:
    { description, when, mapTo?} ): BaseExpectation<T>{

    return new AnyOf<T>(description, when, mapTo)
}



export class AllOf<T> extends BaseExpectation<T> {

    constructor( 
        description, 
        public readonly expectations:  Array<IExpectation<T>>,
        mapTo: (accData: any) => T = (accData) => accData ){
            super(description, undefined, mapTo)
        }

    resolve(inputData: any) : ExpectationStatus<T> {

        let done = false
        let children = this.expectations.map( (expectation) => {
            if(done)
                return new UnresolvedExpectation(expectation)
            let resolved = expectation.resolve(inputData)
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
            ? new FullfiledExpectation(this, this.mapTo(resolveds.elems), children)
            : new RejectedExpectation(this, children)
    }
}

export function expectAllOf<T>( {description, when, mapTo}): BaseExpectation<T>{

    return new AllOf<T>(description, when, mapTo)
}



export class OptionalsOf<T> extends BaseExpectation<T> {

    constructor( 
        description, 
        public readonly expectations:  Array<IExpectation<T>>,
        mapTo: (accData: any) => T = (accData) => accData ){
            super(description, undefined, mapTo)
        }

    resolve(inputData: any) : ExpectationStatus<T> {

        let children = this.expectations.map( (expectation) => expectation.resolve(inputData))
        let resolveds = children.reduce( ( acc, status ) => acc.concat([status.value]), [] )
        return new FullfiledExpectation(this, this.mapTo(resolveds), children)
    }
}


export class ExpectAttribute<T> extends BaseExpectation<T> {

    constructor( 
        public readonly attName: string, 
        public readonly expectation: IExpectation<T>, 
        mapTo: (accData: any) => T = accData => accData 
        ){
        super( `expect attribute ${attName}`,undefined, mapTo)
    }

    resolve(inputData: any) : ExpectationStatus<T> {

        if(inputData[this.attName] == undefined)
            return new RejectedExpectation(this)


        let resolved = this.expectation.resolve(inputData[this.attName])
        return resolved.succeeded 
            ? new FullfiledExpectation(this, this.mapTo(resolved.value), [resolved])
            : new RejectedExpectation(this, [resolved])
    }
}

export function expectAttribute<T>( {name, when}: {name: string, when: IExpectation<T>}): BaseExpectation<T>{

    return new ExpectAttribute<T>(name, when)
}


export function expectCount<T>({count, when}:{count: number, when: IExpectation<T>}){

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
                mapTo: (elems: Array<any>) => {
                    return elems
                    .map( d => when.resolve(d))
                    .filter( d => d.succeeded)
                    .map( d => d.value)
                },
            })
        ],
        mapTo: (d) => d[1]
    }) as BaseExpectation<T[]>
}


export function expectSingle<T>({when}:{when: IExpectation<T>}){

    return expectAnyOf<T>({
        description: `expect single of "${when.description}"`,
        when: [          
            expect({
                description:`a single element`,
                when: (d) => when.resolve(d).succeeded
            }),
            expectAllOf<any>({
                description:"",
                when: 
                [
                    expect({
                        description:'an array',
                        when: (d) => Array.isArray(d),
                    }),
                    expect({
                        description:'an array',
                        when: (elems: Array<unknown>) => elems.filter( d => when.resolve(d).succeeded ).length == 1,
                        mapTo: (elems: Array<unknown>) =>  when.resolve( elems.find( d => when.resolve(d).succeeded ) ).value
                    }),
                ],
                mapTo: (d) => d[1]
            })
        ]
    }) as BaseExpectation<T>
}


export function expectSome<T>({when}:{when: IExpectation<T>}){

    return expectAnyOf<T[]>({
        description:  `some of "${when.description}"`,
        when: [
            expect({
                description:`an element "${when.description}"`,
                when: (d) => when.resolve(d).succeeded,
                mapTo: (d) => [d]
            }),
            expectAllOf<any>({
                description:`an array with element(s) "${when.description}"`,
                when: [
                    expect({
                        description:'an array',
                        when: (d) => Array.isArray(d),
                    }),
                    expect({
                        description:`some element(s) "${when.description}"`,
                        when: (elems: Array<unknown>) => {
                            return elems.filter( d => when.resolve(d).succeeded ).length > 0
                        },
                        mapTo: (elems: Array<unknown>) => {
                            return elems
                            .map( d => when.resolve(d))
                            .filter( d => d.succeeded)
                            .map( d => d.value)
                        },
                    })
                ],
                mapTo: (d) => d[1]
            })
        ]
    }) as BaseExpectation<T[]>
}


export function expect<T>(
    {description, when, mapTo} : 
    {   
        description: string, 
        when: ((inputData: any) => boolean) | IExpectation<any>, 
        mapTo?: (accData: any) => T
    }
        ) : IExpectation<T>{

    if(when instanceof BaseExpectation)
        return new BaseExpectation<T>(description, when, mapTo)

    return new Of<T>(description, when as any, mapTo)
}


export class Contract implements IExpectation<unknown>{

    constructor(
        public readonly description: string,
        public readonly requireds: { [key:string]:IExpectation<unknown>},
        public readonly optionals: { [key:string]:IExpectation<unknown>} = {}
    ){
    }

    resolve( data: unknown ) :  ExpectationStatus<{ [key:string]:unknown}>  {

        let requiredStatus = (new AllOf<any>('requireds', Object.values(this.requireds))).resolve(data)
        let optionalStatus = (new OptionalsOf<any>('optionals', Object.values(this.optionals))).resolve(data)

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
            ? new FullfiledExpectation(this, values,[requiredStatus, optionalStatus])
            : new RejectedExpectation(this, [requiredStatus, optionalStatus])
    }
}

export class FreeContract implements IExpectation<unknown>{

    description = "Free contract: no rules defined (always fullfiled), data passed as it is"
    constructor(){}

    resolve( data: unknown ) :  ExpectationStatus<unknown>  {
        return new FullfiledExpectation<unknown>(this, data,[])
    }
}

export class ContractUnfulfilledError extends Error{

    constructor(message: string, public readonly status: ExpectationStatus<unknown>){
        super(message)
    }
}


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

export function freeContract() : FreeContract{

    return new FreeContract()
}