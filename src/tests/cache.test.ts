import { Cache, ValueKey, ReferenceKey } from '../index'
import { Context, ContextStatus, InfoLog } from '../lib/models'

console.log = () =>{}

test('single ref key', () => {

    let cache = new Cache()
    cache.setCapacity(1)

    let k0 = {}
    let [v0,from0] = cache.getOrCreateWithStatus(new ReferenceKey("test",k0), () => 1 )
    let [v1,from1] = cache.getOrCreateWithStatus(new ReferenceKey("test",k0), () => 1 )
    let [v2,from2] = cache.getOrCreateWithStatus(new ReferenceKey("test",{}), () => 1 )
    
    expect(v0).toEqual(1)
    expect(from0).toEqual(false)
    expect(v1).toEqual(1)
    expect(from1).toEqual(true)
    expect(v2).toEqual(1)
    expect(from2).toEqual(false)
})

test('value key', () => {

    let cache = new Cache()
    cache.setCapacity(1)

    let k0 = {}
    let [v0,from0] = cache.getOrCreateWithStatus(new ValueKey("test",k0), () => 1 )
    let [v1,from1] = cache.getOrCreateWithStatus(new ValueKey("test",k0), () => 1 )
    let [v2,from2] = cache.getOrCreateWithStatus(new ValueKey("test",{}), () => 1 )
    
    expect(v0).toEqual(1)
    expect(from0).toEqual(false)
    expect(v1).toEqual(1)
    expect(from1).toEqual(true)
    expect(v2).toEqual(1)
    expect(from2).toEqual(true)
})

test('value key ', () => {

    let cache = new Cache()
    cache.setCapacity(1)

    let k0 = {}
    let [v0,from0] = cache.getOrCreateWithStatus(new ValueKey("test",k0), () => 1 )
    let [v1,from1] = cache.getOrCreateWithStatus(new ValueKey("test",k0), () => 1 )
    let [v2,from2] = cache.getOrCreateWithStatus(new ValueKey("test",{}), () => 1 )
    
    expect(v0).toEqual(1)
    expect(from0).toEqual(false)
    expect(v1).toEqual(1)
    expect(from1).toEqual(true)
    expect(v2).toEqual(1)
    expect(from2).toEqual(true)
})
test('value key with reporter', () => {

    let cache = new Cache()
    cache.setCapacity(1)
    let reporter : {test :{elapsed:number, inCache:boolean, value: number }} = {} as any
    let k0 = {}
    let context = new Context('creation',{})
    cache.getOrCreate(new ValueKey("test",k0), () => 1, context )

    expect(context.children.length).toEqual(1)
    expect(context.children[0]).toBeInstanceOf(Context)
    let ctx = context.children[0] as Context
    expect(ctx.status()).toEqual(ContextStatus.SUCCESS)
    expect(ctx.elapsed()).toBeGreaterThan(0.)

    context = new Context('creation',{})
    cache.getOrCreate(new ValueKey("test",k0), () => 1, context )
    expect(context.children.length).toEqual(1)
    expect(context.children[0]).toBeInstanceOf(InfoLog)
})
