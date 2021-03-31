import { Cache, ValueKey, ReferenceKey } from '../index'

console.log = () =>{}

test('single ref key', () => {

    let cache = new Cache()
    cache.maxCount = 1

    let k0 = {}
    let [v0,from0] = cache.getOrCreate(new ReferenceKey("test",k0), () => 1 )
    let [v1,from1] = cache.getOrCreate(new ReferenceKey("test",k0), () => 1 )
    let [v2,from2] = cache.getOrCreate(new ReferenceKey("test",{}), () => 1 )
    
    expect(v0).toEqual(1)
    expect(from0).toEqual(false)
    expect(v1).toEqual(1)
    expect(from1).toEqual(true)
    expect(v2).toEqual(1)
    expect(from2).toEqual(false)
})

test('value key', () => {

    let cache = new Cache()
    cache.maxCount = 1

    let k0 = {}
    let [v0,from0] = cache.getOrCreate(new ValueKey("test",k0), () => 1 )
    let [v1,from1] = cache.getOrCreate(new ValueKey("test",k0), () => 1 )
    let [v2,from2] = cache.getOrCreate(new ValueKey("test",{}), () => 1 )
    
    expect(v0).toEqual(1)
    expect(from0).toEqual(false)
    expect(v1).toEqual(1)
    expect(from1).toEqual(true)
    expect(v2).toEqual(1)
    expect(from2).toEqual(true)
})

test('value key ', () => {

    let cache = new Cache()
    cache.maxCount = 1

    let k0 = {}
    let [v0,from0] = cache.getOrCreate(new ValueKey("test",k0), () => 1 )
    let [v1,from1] = cache.getOrCreate(new ValueKey("test",k0), () => 1 )
    let [v2,from2] = cache.getOrCreate(new ValueKey("test",{}), () => 1 )
    
    expect(v0).toEqual(1)
    expect(from0).toEqual(false)
    expect(v1).toEqual(1)
    expect(from1).toEqual(true)
    expect(v2).toEqual(1)
    expect(from2).toEqual(true)
})
test('value key with reporter', () => {

    let cache = new Cache()
    cache.maxCount = 1
    let reporter : {test :{elapsed:number, inCache:boolean, value: number }} = {} as any
    let k0 = {}
    cache.getOrCreate(new ValueKey("test",k0), () => 1 , reporter)

    expect(reporter.test).toBeDefined
    expect(reporter.test.elapsed).toBeGreaterThan(0.)
    expect(reporter.test.inCache).toBeFalsy()
    expect(reporter.test.value).toEqual(1)

    cache.getOrCreate(new ValueKey("test",k0), () => 1 , reporter)

    expect(reporter.test).toBeDefined
    expect(reporter.test.inCache).toBeTruthy()
    expect(reporter.test.value).toEqual(1)    
})

test('ref key with reporter', () => {

    let cache = new Cache()
    cache.maxCount = 1
    let reporter : {test :{elapsed:number, inCache:boolean, value: number }} = {} as any
    let k0 = {}
    cache.getOrCreate(new ReferenceKey("test",k0), () => 1 , reporter)

    expect(reporter.test).toBeDefined
    expect(reporter.test.elapsed).toBeGreaterThan(0.)
    expect(reporter.test.inCache).toBeFalsy()
    expect(reporter.test.value).toEqual(1)

    cache.getOrCreate(new ReferenceKey("test",k0), () => 1 , reporter)

    expect(reporter.test).toBeDefined
    expect(reporter.test.inCache).toBeTruthy()
    expect(reporter.test.value).toEqual(1)    
})
