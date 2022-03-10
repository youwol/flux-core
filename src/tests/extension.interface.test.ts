/** @format */

import { ExtensionsObservables } from '../index'
console.log = () => {}

test('assert interface', () => {
    const i = new ExtensionsObservables()
    expect(i.projectUpdated$).toBeDefined()
})
