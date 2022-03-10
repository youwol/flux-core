/** @format */

import { Schema, Property } from '../index'

console.log = () => {}
const pack: any = {}

//-----------------------------------------------------------------------------
//-----------------------------------------------------------------------------

@Schema({
    pack: pack,
    description: 'A simple properties class',
})
export class PropertiesClass {
    @Property({ description: 'a string property' })
    readonly strProp: string

    @Property({ description: 'a number property', type: 'float', default: 0 })
    readonly numberProp: number
}
test('PropertiesClass', () => {
    expect(pack.schemas.PropertiesClass).toBeDefined()
    expect(pack.schemas.PropertiesClass.attributes.strProp).toBeDefined()
    expect(pack.schemas.PropertiesClass.attributes.strProp.name).toBe('strProp')
    expect(pack.schemas.PropertiesClass.attributes.strProp.type).toBe('String')
    expect(
        pack.schemas.PropertiesClass.attributes.strProp.metadata.description,
    ).toBe('a string property')
    expect(
        pack.schemas.PropertiesClass.attributes.numberProp.metadata.type,
    ).toBe('float')
    expect(
        pack.schemas.PropertiesClass.attributes.numberProp.metadata.default,
    ).toBe(0)
})

//-----------------------------------------------------------------------------
//-----------------------------------------------------------------------------

@Schema({
    pack: pack,
    description: 'A 3D object defined by its geometry and material',
})
export class PropertiesClass_1 {
    @Property({ description: 'a string property' })
    readonly strProp
}

test('PropertiesClass_1', () => {
    expect(pack.schemas.PropertiesClass_1).toBeDefined()
    expect(pack.schemas.PropertiesClass_1.attributes.strProp).toBeDefined()
    expect(pack.schemas.PropertiesClass_1.attributes.strProp.name).toBe(
        'strProp',
    )
    expect(pack.schemas.PropertiesClass_1.attributes.strProp.type).toBe(
        'Object',
    )
})

//-----------------------------------------------------------------------------
//-----------------------------------------------------------------------------

@Schema({
    pack: pack,
    description: 'A derived class',
})
export class DerivedClass extends PropertiesClass {}

test('DerivedClass', () => {
    expect(pack.schemas.DerivedClass).toBeDefined()
    expect(pack.schemas.DerivedClass.extends[0]).toBe('PropertiesClass')
})
