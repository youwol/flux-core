import { Schema, Property, Method } from "../index"

console.log = () =>{}
let pack : any = {}

//-----------------------------------------------------------------------------
//-----------------------------------------------------------------------------

@Schema({
    pack: pack,
    description: "A simple properties class"
})
export class PropertiesClass {

    @Property({ description: "a string property" })
    readonly strProp: string

    @Property({ description: "a number property" , type: 'float', default:0})
    readonly numberProp: number

}
test('PropertiesClass', () => {

    expect(pack.schemas.PropertiesClass).toBeDefined()        
    expect(pack.schemas.PropertiesClass.attributes.strProp).toBeDefined()   
    expect(pack.schemas.PropertiesClass.attributes.strProp.name).toEqual("strProp")  
    expect(pack.schemas.PropertiesClass.attributes.strProp.type).toEqual("String")  
    expect(pack.schemas.PropertiesClass.attributes.strProp.metadata.description).toEqual("a string property")   
    expect(pack.schemas.PropertiesClass.attributes.numberProp.metadata.type).toEqual("float")        
    expect(pack.schemas.PropertiesClass.attributes.numberProp.metadata.default).toEqual(0)    
})

//-----------------------------------------------------------------------------
//-----------------------------------------------------------------------------

@Schema({
    pack: pack,
    description: "A 3D object defined by its geometry and material"
})
export class PropertiesClass_1 {

    @Property({ description: "a string property" })
    readonly strProp
}

test('PropertiesClass_1', () => {

    expect(pack.schemas.PropertiesClass_1).toBeDefined()        
    expect(pack.schemas.PropertiesClass_1.attributes.strProp).toBeDefined()   
    expect(pack.schemas.PropertiesClass_1.attributes.strProp.name).toEqual("strProp")  
    expect(pack.schemas.PropertiesClass_1.attributes.strProp.type).toEqual("Object")    
})

//-----------------------------------------------------------------------------
//-----------------------------------------------------------------------------

@Schema({
    pack: pack,
    description: "A 3D object defined by its geometry and material"
})
export class MethodsClass {

    @Method({ description: "a method" })
    do( arg1: number, arg2 :PropertiesClass_1 ) : PropertiesClass { return undefined }
}

test('MethodsClass', () => {

    expect(pack.schemas.MethodsClass).toBeDefined()        
    expect(pack.schemas.MethodsClass.methods.do).toBeDefined()   
    expect(pack.schemas.MethodsClass.methods.do.name).toEqual("do")   
    expect(pack.schemas.MethodsClass.methods.do.return).toEqual("PropertiesClass")    
    expect(pack.schemas.MethodsClass.methods.do.arguments).toEqual(['Number','PropertiesClass_1'])       
    expect(pack.schemas.MethodsClass.methods.do.metadata.description).toEqual("a method")           
})

//-----------------------------------------------------------------------------
//-----------------------------------------------------------------------------

@Schema({
    pack: pack,
    description: "A 3D object defined by its geometry and material"
})
export class MethodsClass_1 {

    @Method({ description: "a method" })
    do( arg1, arg2 :PropertiesClass_1 )  { return undefined }
}

test('MethodsClass', () => {

    expect(pack.schemas.MethodsClass_1).toBeDefined()          
    expect(pack.schemas.MethodsClass_1.methods.do.return).toEqual("Any")    
    expect(pack.schemas.MethodsClass_1.methods.do.arguments).toEqual(['Object','PropertiesClass_1']) 
})

//-----------------------------------------------------------------------------
//-----------------------------------------------------------------------------

@Schema({
    pack: pack,
    description: "A derived class"
})
export class DerivedClass extends PropertiesClass {

}

test('DerivedClass', () => {

    expect(pack.schemas.DerivedClass).toBeDefined()      
    expect(pack.schemas.DerivedClass.extends[0]).toEqual("PropertiesClass")              
})


