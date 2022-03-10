/** @format */

import { retrieveData } from '../index'

console.log = () => {}

class Toto {
    readonly toto = true
    constructor() {}
}
class Tata {
    readonly tata = true
    constructor() {}
}

class Tatu extends Tata {
    readonly tutu = true
    constructor() {
        super()
    }
}

test('retrieving in various order', () => {
    const toto = new Toto()
    const tata = new Tata()
    const tatu = new Tatu()

    const test1 = [toto, tata, tatu]
    const retrieved = retrieveData<[Tata, Tatu, Toto]>(test1, [
        (d) => d instanceof Tata,
        (d) => d instanceof Tatu,
        (d) => d instanceof Toto,
    ])

    expect(retrieved).toEqual([tata, tatu, toto])

    const test2 = [toto, tatu, tata]
    const retrieved2 = retrieveData<[Tata, Tatu, Toto]>(test2, [
        (d) => d instanceof Tata,
        (d) => d instanceof Tatu,
        (d) => d instanceof Toto,
    ])
    expect(retrieved2).toEqual([tatu, undefined, toto])
})
