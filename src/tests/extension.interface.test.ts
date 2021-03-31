import { ExtensionsObservables } from "../index"
console.log = () =>{}

test('assert interface', () => {

    let i = new ExtensionsObservables()
    expect(i.projectUpdated$).toBeDefined()
})
