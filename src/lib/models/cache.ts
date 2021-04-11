
abstract class CacheKey {

    type = ""
    constructor(public readonly name: string) { }

    abstract isSame(v): boolean
}

export class ReferenceKey extends CacheKey {

    type = "RefKey"

    public readonly values: Array<Object>

    constructor(name: string, ...values: Array<Object>) {
        super(name)
        this.values = values
    }
    isSame(key: ReferenceKey) {
        let equalities = this.values.map((v, i) => v == key.values[i])
        return equalities.find(isSame => !isSame) == undefined
    }
}

export class ValueKey extends CacheKey {
    
    type = "ValueKey"

    public readonly keyStr

    constructor(name: string, public readonly v) {
        super(name)
        this.keyStr = JSON.stringify(this.v)
    }

    isSame(v2: ValueKey) {
        return this.keyStr === v2.keyStr
    }
}

export class Cache {

    maxCount = 1
    cachedObjectsValue = new Array<[ValueKey, Object]>()
    cachedObjectsRef = new Array<[ReferenceKey, Object]>()

    constructor() { }

    getOrCreate(key: CacheKey, creatorFct, reporter = undefined) {

        if (key.type === "ValueKey")
            return this.getOrCreateValueKey(key as ValueKey, creatorFct, reporter)
        if (key.type === "RefKey")
            return this.getOrCreateRefKey(key as ReferenceKey, creatorFct, reporter)
    }

    get(key: CacheKey) {
        return this.getOrCreate(key, undefined)
    }

    createValue(creatorFct, reporter, key) {
        if (reporter) {
            let t0 = performance.now();
            let obj = creatorFct()
            reporter[key.name] = { value: obj, inCache: false, elapsed: performance.now() - t0 }
            return obj
        }
        return creatorFct()
    }
    getOrCreateValueKey(key: ValueKey, creatorFct, reporter = undefined) {

        let cachedObjectsValue = this.cachedObjectsValue.filter(c => c[0].name == key.name)
        let cached = cachedObjectsValue.find(([k, v]) => k.isSame(key as ValueKey))
        if (cached) {
            if (reporter)
                reporter[key.name] = { value: cached[1], inCache: true }
            return [cached[1], true]
        }
        let obj = this.createValue(creatorFct, reporter, key)

        if (this.maxCount == 1 && this.cachedObjectsValue.length == 1) {
            this.cachedObjectsValue[0] = [key as ValueKey, obj]
            return [obj, false]
        }
        this.cachedObjectsValue.push([key as ValueKey, obj])

        if (this.cachedObjectsValue.length > this.maxCount)
            this.cachedObjectsValue.slice(1)

        return [obj, false]
    }

    getOrCreateRefKey(key: ReferenceKey, creatorFct, reporter = undefined) {
        let cachedObjectsRef = this.cachedObjectsRef.filter(c => c[0].name == key.name)

        let cached = cachedObjectsRef.find(([k, v]) => k.isSame(key))

        if (cached) {
            if (reporter)
                reporter[key.name] = { value: cached[1], inCache: true }
            return [cached[1], true]
        }

        let obj = this.createValue(creatorFct, reporter, key)

        if (this.maxCount == 1 && this.cachedObjectsRef.length == 1) {
            this.cachedObjectsRef[0] = [key as ReferenceKey, obj]
            return [obj, false]
        }
        this.cachedObjectsRef.push([key as ReferenceKey, obj])

        if (this.cachedObjectsRef.length > this.maxCount)
            this.cachedObjectsRef.slice(1)

        return [obj, false]
    }
}
