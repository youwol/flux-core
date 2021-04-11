import { expect as expect_, expectCount, expectSome, BaseExpectation, 
    expectAnyOf, expectAllOf, expectAttribute, contract, expectSingle} from "../lib/models/contract"



class Material{}
class Mesh{}
class Option1{}
class Option2{}

class ExpectCollec{
    static straightLeafNumber: BaseExpectation<number> = undefined
    static permissiveLeafNumber: BaseExpectation<number> = undefined
    static permissiveNumber: BaseExpectation<number> = undefined
    static material = expect_({ description:"material",  when:(d) => d instanceof Material })
    static mesh = expect_({ description:"mesh",  when:(d) => d instanceof Mesh })
    static option1 = expect_({ description:"option1",  when:(d) => d instanceof Option1 })
    static option2 = expect_({ description:"option2",  when:(d) => d instanceof Option2 })
}


test('straightLeafNumber', () => {

    let straightLeafNumber = expect_<number>({
        description: `straightLeafNumber`,
        when: (inputData) => typeof (inputData) == 'number',
        mapTo: (accData) => accData
    }) as BaseExpectation<number>

    let scenarios = [ 
        {data:5, succeeded:true, value:5}, 
        {data:"5", succeeded: false, value:undefined} 
    ]
    scenarios.map( (scenario) => {
        let {succeeded, value} = straightLeafNumber.resolve(scenario.data)
        expect(succeeded).toEqual( scenario.succeeded)
        expect(value).toEqual( scenario.value)
    })

    ExpectCollec.straightLeafNumber = straightLeafNumber
})


test('permissiveLeafNumber; no allOf', () => {

    let permissiveLeafNumber = expectAnyOf<number>({
        description: `permissiveLeafNumber`,
        when: [
            ExpectCollec.straightLeafNumber,
            expect_<number>({
                description: 'stringCompatible',
                when: (inputData) => typeof (inputData) == 'string' && !isNaN(parseFloat(inputData)),
                mapTo: (accData: string) => parseFloat(accData)
            })
        ]
    }) as BaseExpectation<number>

    let scenarios = [ 
        {data:5, succeeded:true, value:5}, 
        {data:"5", succeeded: true, value:5},
        {data:"tutu", succeeded: false, value:undefined},
    ]

    scenarios.map( (scenario) => {
        let {succeeded, value} = permissiveLeafNumber.resolve(scenario.data)
        expect(succeeded).toEqual( scenario.succeeded)
        expect(value).toEqual( scenario.value)
    })

    ExpectCollec.permissiveLeafNumber = permissiveLeafNumber 
})

test('permissiveLeafNumber; with allOf', () => {

    let permissiveLeafNumber = expectAnyOf<number>({
        description: `permissiveLeafNumber`,
        when: [
            ExpectCollec.straightLeafNumber,
            expectAllOf<number>({
                description: 'stringCompatible',
                when: [
                    expect_({
                        description: 'is a string',
                        when: (inputData: any) => typeof (inputData) == 'string'
                    }),
                    expect_({
                        description: 'can be converted in float',
                        when: (inputData: string) => !isNaN(parseFloat(inputData)),
                        mapTo: (inputData) => parseFloat(inputData)
                    }),
                ], 
                mapTo: (data) => data[1]
            })
        ],
        mapTo: (accData) => accData
    }) as BaseExpectation<number>

    let scenarios = [ 
        {data:5, succeeded:true, value:5}, 
        {data:"5", succeeded: true, value:5},
        {data:"tutu", succeeded: false, value:undefined},
    ]

    scenarios.map( (scenario) => {
        
        let {succeeded, value} = permissiveLeafNumber.resolve(scenario.data)
        expect(succeeded).toEqual( scenario.succeeded)
        expect(value).toEqual( scenario.value)
    })

    ExpectCollec.permissiveLeafNumber = permissiveLeafNumber 
})

test('permissiveNumber', () => {

    let permissiveNumber = expectAnyOf<number>({
        description: `permissiveNumber`,
        when: [
            ExpectCollec.permissiveLeafNumber,
            expectAttribute({ name: 'value', when: ExpectCollec.permissiveLeafNumber })
        ],
        mapTo: (accData) => accData
    }) as BaseExpectation<number>

    let scenarios = [ 
        {data:5, succeeded:true, value:5}, 
        {data:"5", succeeded: true, value:5},
        {data:"tutu", succeeded: false, value:undefined},
        {data:{value:5}, succeeded: true, value:5},
        {data:{value:"5"}, succeeded: true, value:5},
        {data:{value:"tutu"}, succeeded: false, value:undefined},
        {data:{tata:2}, succeeded: false, value:undefined},
    ]

    scenarios.map( (scenario) => {
        let {succeeded, value} = permissiveNumber.resolve(scenario.data)
        expect(succeeded).toEqual( scenario.succeeded)
        expect(value).toEqual( scenario.value)
    })

    ExpectCollec.permissiveNumber = permissiveNumber 
})


test('two Numbers; raw', () => {

    let twoNumbers = expectAllOf<number>({
        description: `two numbers`,
        when: [
            expect_({
                description:'an array',
                when: (d) => Array.isArray(d),
            }),
            expect_({
                description:'2 numbers',
                when: (elems: Array<any>) => {
                    return elems.filter( d => ExpectCollec.permissiveNumber.resolve(d).succeeded ).length == 2
                },
                mapTo: (elems: Array<any>) => {
                    return elems
                    .map( d => ExpectCollec.permissiveNumber.resolve(d))
                    .filter( d => d.succeeded)
                    .map( d => d.value)
                },
            })
        ],
        mapTo: (d) => d[1]
    }) as BaseExpectation<number>

    let scenarios = [ 
        {data:5, succeeded:false, value:undefined},
        {data:[5,2], succeeded:true, value:[5,2]},
        {data:[5,2, "aa", 'fef'], succeeded:true, value:[5,2]},
        {data:[5,'tutu'], succeeded:false, value:undefined},
        {data:[5,{ value:2}], succeeded:true, value:[5,2]},
    ]

    scenarios.map( (scenario) => {
        let {succeeded, value} = twoNumbers.resolve(scenario.data)
        expect(succeeded).toEqual( scenario.succeeded)
        expect(value).toEqual( scenario.value)
    })
})



test('2 numbers', () => {

    let twoNumbers = expectCount<number>( {count:2, when:ExpectCollec.permissiveNumber}) as BaseExpectation<number[]>

    let scenarios = [ 
        {data:5, succeeded:false, value:undefined},
        {data:[5,2], succeeded:true, value:[5,2]},
        {data:[5,2, "aa", 'fef'], succeeded:true, value:[5,2]},
        {data:[5,'tutu'], succeeded:false, value:undefined},
        {data:[5,{ value:2}], succeeded:true, value:[5,2]},
        {data:["5",{ value:2}], succeeded:true, value:[5,2]},
        {data:[5,{ value:2},7], succeeded:false, value:undefined},
    ]

    scenarios.map( (scenario) => {
        let {succeeded, value} = twoNumbers.resolve(scenario.data)
        expect(succeeded).toEqual( scenario.succeeded)
        expect(value).toEqual( scenario.value)
    })
})


test('some numbers', () => {

    let someNumbers = expectSome<number>({when:ExpectCollec.permissiveNumber}) as BaseExpectation<number[]>

    let scenarios = [ 
        {data:5, succeeded:true, value:[5]},
        {data:[5,2], succeeded:true, value:[5,2]},
        {data:[5,{ value:2}, "aa", 'fef'], succeeded:true, value:[5,2]},           
        {data:'tutu', succeeded:false, value:undefined},     
        {data:['tutu'], succeeded:false, value:undefined}
    ]

    scenarios.map( (scenario) => {
        let {succeeded, value} = someNumbers.resolve(scenario.data)
        expect(succeeded).toEqual( scenario.succeeded)
        expect(value).toEqual( scenario.value)
    })
})


test('contract', () => {

    let inputContract = contract({
        description: "resolve one material & some meshes with some options",
        requireds: {   
            mat:expectSingle<Material>({when:ExpectCollec.material}), 
            mesh:expectSome<Mesh>({when:ExpectCollec.mesh}), 
        },
        optionals: {
            option1 : expectSome<Option1>({when:ExpectCollec.option1}), 
            option2: expectSome<Option2>({when:ExpectCollec.option2}), 
        }
    })
    let [mesh, mat, option1, option2] = [new Mesh(), new Material(), new Option1(), new Option2()]

    let scenarios = [ 
        {data:[mesh], succeeded:false, value:undefined},
        {data:[mesh, mat], succeeded:true, value:{mesh:[mesh], mat:mat, option1:undefined, option2:undefined}},
        {data:[mesh, mat, mat], succeeded:false, value: undefined},
        {data:[5,mesh, "aa", option1], succeeded:false, value:undefined},          
        {data:[mesh, mat,mesh, "aa", option1], succeeded:true, value:{mesh:[mesh, mesh], mat:mat, option1:[option1], option2:undefined}},
        {data:[mat,mesh, "aa", option2, option1], succeeded:true, value:{mesh:[mesh], mat:mat, option1:[option1], option2:[option2]}},
    ]
    scenarios.forEach( ({data, succeeded, value}) => {
        let resolved = inputContract.resolve(data)
        expect(resolved.succeeded).toEqual(succeeded)
        expect(resolved.value).toEqual(value)
    })       
})