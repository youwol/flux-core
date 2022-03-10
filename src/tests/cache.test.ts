/** @format */

import { Cache, ReferenceKey, ValueKey } from '../index'
import { Context, ContextStatus, InfoLog } from '../lib/models'

console.log = () => {}

test('single ref key', () => {
    const cache = new Cache()
    cache.setCapacity(1)

    const k0 = {}
    const [v0, from0] = cache.getOrCreateWithStatus(
        new ReferenceKey('test', k0),
        () => 1,
    )
    const [v1, from1] = cache.getOrCreateWithStatus(
        new ReferenceKey('test', k0),
        () => 1,
    )
    const [v2, from2] = cache.getOrCreateWithStatus(
        new ReferenceKey('test', {}),
        () => 1,
    )

    expect(v0).toBe(1)
    expect(from0).toBe(false)
    expect(v1).toBe(1)
    expect(from1).toBe(true)
    expect(v2).toBe(1)
    expect(from2).toBe(false)
})

test('value key', () => {
    const cache = new Cache()
    cache.setCapacity(1)

    const k0 = {}
    const [v0, from0] = cache.getOrCreateWithStatus(
        new ValueKey('test', k0),
        () => 1,
    )
    const [v1, from1] = cache.getOrCreateWithStatus(
        new ValueKey('test', k0),
        () => 1,
    )
    const [v2, from2] = cache.getOrCreateWithStatus(
        new ValueKey('test', {}),
        () => 1,
    )

    expect(v0).toBe(1)
    expect(from0).toBe(false)
    expect(v1).toBe(1)
    expect(from1).toBe(true)
    expect(v2).toBe(1)
    expect(from2).toBe(true)
})

test('value key', () => {
    const cache = new Cache()
    cache.setCapacity(1)

    const k0 = {}
    const [v0, from0] = cache.getOrCreateWithStatus(
        new ValueKey('test', k0),
        () => 1,
    )
    const [v1, from1] = cache.getOrCreateWithStatus(
        new ValueKey('test', k0),
        () => 1,
    )
    const [v2, from2] = cache.getOrCreateWithStatus(
        new ValueKey('test', {}),
        () => 1,
    )

    expect(v0).toBe(1)
    expect(from0).toBe(false)
    expect(v1).toBe(1)
    expect(from1).toBe(true)
    expect(v2).toBe(1)
    expect(from2).toBe(true)
})
test('value key with reporter', () => {
    const cache = new Cache()
    cache.setCapacity(1)
    const reporter: {
        test: { elapsed: number; inCache: boolean; value: number }
    } = {} as any
    const k0 = {}
    let context = new Context('creation', {})
    cache.getOrCreate(new ValueKey('test', k0), () => 1, context)

    expect(context.children).toHaveLength(1)
    expect(context.children[0]).toBeInstanceOf(Context)
    const ctx = context.children[0] as Context
    expect(ctx.status()).toEqual(ContextStatus.SUCCESS)
    expect(ctx.elapsed()).toBeGreaterThan(0)

    context = new Context('creation', {})
    cache.getOrCreate(new ValueKey('test', k0), () => 1, context)
    expect(context.children).toHaveLength(1)
    expect(context.children[0]).toBeInstanceOf(InfoLog)
})
