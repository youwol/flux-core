import { configurationStatus, StatusEnum } from "../lib/module-flow/configuration-validation"
import { Property, Schema } from "../lib/module-flow/decorators"
import { MockEnvironment } from "./project-loading.test"
import { DropDown, testPack } from "./test-modules"


@Schema({
    pack: testPack
})
export class Base {

    @Property({})
    numberProp : number

    constructor({numberProp } :{numberProp?:number}= {}) {
        this.numberProp = (numberProp != undefined) ? numberProp : 0
    }
}

@Schema({
    pack: testPack
})
export class Data {

    @Property({
        type:'integer'
    })
    x : number

    @Property({ 
        type:'integer'
    })
    y : number

    constructor({x, y} :{x?:number, y?:number}= {}) {
        this.x = (x != undefined) ? x : 0
        this.y = (y != undefined) ? y : 0
    }
}


@Schema({
    pack: testPack
})
export class Derived extends Base {

    @Property({ enum:["a", "b", "c"]})
    enumProp : string

    @Property({})
    data: Data

    @Property({
        type:'code'
    })
    code: string

    constructor({enumProp, code, ...rest } :{enumProp?:string, code?: string} = {}) {
        super()
        this.enumProp = (enumProp != undefined) ? enumProp : "a"
        this.code = (code != undefined) ? code : ""
        this.data = new Data(rest)
    }
}


test('default configuration', () => {

    let persistentData = new Derived()
    let status = configurationStatus(persistentData)

    expect(status.status).toEqual(StatusEnum.Consistent)
    expect(status.intrus).toEqual([])
    expect(status.missings).toEqual([])
    expect(status.typeErrors).toEqual([])
})

test('consistent replacment', () => {

    let persistentData = new Derived()
    let status = configurationStatus(
        persistentData,
        {
            numberProp: 2, 
            enumProp: ['b'], 
            data:{x:4},
            code: "function foo(){"
        })

    expect(status.status).toEqual(StatusEnum.Consistent)
    expect(status.intrus).toEqual([])
    expect(status.missings).toEqual([])
    expect(status.typeErrors).toEqual([])
})

test('unconsistent replacment', () => {

    let persistentData = new Derived()
    let status = configurationStatus(persistentData,{numberProp: "2", enumProp: "f", data:{x:5.2} })
    expect(status.status).toEqual(StatusEnum.Error)
    expect(status.intrus).toEqual([])
    expect(status.missings).toEqual([])
    expect(status.typeErrors.length).toEqual(3)
    expect(status.typeErrors[0]).toEqual({
        attributeName: "enumProp",
        actualValue: "f",
        expectedType: "String",
        error: "Got 'f' while expected values from enum are: a,b,c",
      })
    expect(status.typeErrors[1]).toEqual({
        attributeName: "data.x",
        actualValue: 5.2,
        expectedType: "Integer",
        error: "Got '5.2' while 'integer' expected",
      })
    expect(status.typeErrors[2]).toEqual({
        attributeName: "numberProp",
        actualValue: "2",
        expectedType: "Number",
        error: "Got 'string' while 'Number' expected.",
      })
})


test('unexpected value', () => {

    let persistentData = new Derived()
    let status = configurationStatus(persistentData,{tutu: "2", data: {toto:5} })

    expect(status.status).toEqual(StatusEnum.Warning)
    expect(status.intrus).toEqual(['/tutu','/data/toto'])
    expect(status.missings).toEqual([])
    expect(status.typeErrors).toEqual([])
})

test('missing value', () => {

    let persistentData = new Derived()
    let status = configurationStatus(persistentData,{data: 0})

    expect(status.status).toEqual(StatusEnum.Error)
    expect(status.intrus).toEqual([])
    expect(status.missings).toEqual(['/data/x','/data/y'])
    expect(status.typeErrors).toEqual([
        {
          attributeName: "data",
          actualValue: 0,
          expectedType: "Data",
          error: "Got 'number' while 'Data' expected.",
        },
        {
          attributeName: "data.x",
          actualValue: undefined,
          expectedType: "Number",
          error: "Got undefined while a string or number was expected",
        },
        {
          attributeName: "data.y",
          actualValue: undefined,
          expectedType: "Number",
          error: "Got undefined while a string or number was expected",
        },
      ])
})
