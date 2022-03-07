/** @format */

import { Property, Schema } from '../models/decorators'
import { packCore } from './factory-pack-core'

const defaultVariableCode = `
/* you can provide variable accessible in the group here
* e.g. 'return { someParameter: 1 }
* To use 'someParameter' in a module configuration...to be defined
*/
return {}
`
export namespace Schemas {
    @Schema({
        pack: packCore,
        description: 'GroupModuleConfiguration',
    })
    export class GroupModuleConfiguration {
        @Property({
            description: 'explicitInputsCount',
            type: 'integer',
        })
        explicitInputsCount = 0

        @Property({
            description: 'explicitOutputsCount',
            type: 'integer',
        })
        explicitOutputsCount = 0

        @Property({
            description: 'creation function',
            type: 'code',
        })
        environment: string = defaultVariableCode

        @Property({
            description: 'creation function',
            type: 'code',
        })
        moduleIds: string | string[] = []

        getModuleIds(): string[] {
            if (typeof this.moduleIds == 'string') {
                this.moduleIds = new Function(this.moduleIds)()
            }
            return this.moduleIds as string[]
        }

        constructor(
            params: {
                moduleIds?: string | Array<string>
                explicitInputsCount?: number
                explicitOutputsCount?: number
                environment?: string
            } = {},
        ) {
            Object.assign(this, params)
        }
    }
}
