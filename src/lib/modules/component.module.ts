/** @format */

import { HTMLElement$, render, VirtualDOM } from '@youwol/flux-view'
import { Observable, ReplaySubject } from 'rxjs'
import { Workflow } from '../flux-project'
import {
    BuilderView,
    Flux,
    Property,
    RenderView,
    Schema,
} from '../models/decorators'
import { renderTemplate } from '../models/render-html'
import { packCore } from './factory-pack-core'
import { GroupModules } from './group.module'
import { Schemas } from './schemas'

export namespace Component {
    export const rootComponentId = 'Component_root-component'
    export function getRootComponentData(
        params: {
            html?: string
            css?: string
            moduleIds?: string[]
            environment?: string
            explicitInputsCount?: number
            explicitOutputsCount?: number
        } = {},
    ) {
        const data = Object.assign(
            {
                moduleIds: [],
                html: `<div id='${rootComponentId}' class='flux-element flux-component'></div>`,
                css: '',
                environment: 'return {}',
                explicitInputsCount: 0,
                explicitOutputsCount: 0,
            },
            params,
        )
        return {
            moduleId: rootComponentId,
            factoryId: { module: 'Component', pack: '@youwol/flux-core' },
            configuration: {
                title: 'Root component',
                description: 'This is the root component',
                data,
            },
        }
    }

    export const id = 'component'
    export const uid = 'component@flux-pack-core'
    export const displayName = 'Component'

    @Schema({
        pack: packCore,
        description: 'Persistent Data of Component',
    })
    export class PersistentData extends Schemas.GroupModuleConfiguration {
        @Property({
            description: 'The HTML definition',
            type: 'code',
            editorConfiguration: {
                mode: 'xml',
                htmlMode: true,
            },
        })
        html = ''

        @Property({
            description: 'The CSS definition',
            type: 'code',
            editorConfiguration: {
                mode: 'css',
            },
        })
        css = ''

        constructor({
            html,
            css,
            ...others
        }: {
            html?: string
            css?: string
            classes?: string
        } = {}) {
            super(Object.assign(others, {}) as any)

            if (html) {
                this.html = html
            }

            if (css) {
                this.css = css
            }
        }
    }

    function toHtml(component: Module): HTMLDivElement {
        const content = component.getPersistentData<PersistentData>().html
        const template = document.createElement('template')
        template.innerHTML = (content as any).trim()
        return template.content.firstChild as HTMLDivElement
    }

    @Flux({
        pack: packCore,
        namespace: Component,
        id: 'Component',
        displayName: 'Component',
        description: 'Component',
    })
    @BuilderView({
        namespace: Component,
        render: (mdle, icon) =>
            GroupModules.groupModulePlot({
                module: mdle,
                icon: icon,
                width: 150,
                vMargin: 50,
                vStep: 25,
            }),
        icon: GroupModules.svgIcon,
    })
    @RenderView({
        namespace: Component,
        render: (mdle: Module) => renderHtmlElement(mdle),
    })
    export class Module extends GroupModules.Module {
        renderedElementDisplayed$ = new ReplaySubject<HTMLDivElement>()

        // This attribute is a temporary storage of layout and style when component are loaded from asset store.
        // It is used by grapes.js to load initial state of the component.
        // Definitely not ideal
        rendering: any

        constructor(params) {
            super(params)
        }

        getOuterHTML(): HTMLDivElement {
            return toHtml(this)
        }

        getFullHTML(workflow: Workflow): HTMLDivElement {
            const root = toHtml(this)
            if (!root) {
                return root
            }

            const childrenComponents = this.getAllChildren(workflow).filter(
                (child) => child instanceof Module,
            ) as Array<Module>

            const divComponents = childrenComponents.reduce(
                (acc, component) => ({
                    ...acc,
                    ...{ [component.moduleId]: toHtml(component) },
                }),
                {},
            )

            while (Object.entries(divComponents).length > 0) {
                const previousLength = Object.entries(divComponents).length
                Array.from(root.querySelectorAll('.flux-component'))
                    .filter((item) => divComponents[item.id] != undefined)
                    .forEach((htmlDiv) => {
                        htmlDiv.replaceWith(divComponents[htmlDiv.id])
                        delete divComponents[htmlDiv.id]
                    })
                if (Object.entries(divComponents).length == previousLength) {
                    break
                }
            }
            return root
        }

        getFullHTML$(): Observable<HTMLDivElement> {
            return this.mapTo((wf) => this.getFullHTML(wf))
        }

        getOuterCSS(
            { asString }: { asString } = { asString: true },
        ): CSSStyleSheet | string {
            const cssString = this.getPersistentData<PersistentData>().css
            if (asString) {
                return cssString
            }

            const styleSheet = new CSSStyleSheet()
            cssString
                .split('}')
                .filter((rule) => rule != '')
                .forEach((rule) => styleSheet.insertRule(rule))
            return styleSheet
        }

        getFullCSS(
            workflow: Workflow,
            { asString }: { asString } = { asString: true },
        ): CSSStyleSheet | string {
            const css = () => {
                return this.getAllChildren(workflow)
                    .filter((child) => child instanceof Module)
                    .map((child) => child.getPersistentData<PersistentData>())
                    .reduce(
                        (acc: string, e: PersistentData) => acc + '\n' + e.css,
                        this.getPersistentData<PersistentData>().css,
                    )
            }
            const css_string = css()

            if (asString) {
                return css_string
            }

            const styleSheet = new CSSStyleSheet()
            css_string
                .split('}')
                .filter((rule) => rule != '')
                .forEach((rule) => styleSheet.insertRule(rule))
            return styleSheet
        }

        getFullCSS$(
            workflow: Workflow,
            { asString }: { asString } = { asString: true },
        ): Observable<CSSStyleSheet | string> {
            return this.mapTo((wf) => this.getFullCSS(wf, { asString }))
        }
    }

    export function renderHtmlElement(mdle: Module) {
        // The following div is appended to track the lifecycle
        // of the component's div in the DOM and bind the workflow$ subscription to it.
        // To not insert any additional wrapper, we use elem.parentElement.appendChild(child).
        // Maybe renderHtmlElement should accept Observable<HTMLElement>...but not sure
        // how to deal with lifecycle & subscription.

        const virtualDOM: VirtualDOM = {
            class: 'flux-component-tracker',
            style: {
                display: 'none',
            },
            connectedCallback: (elem: HTMLElement$ & HTMLDivElement) => {
                const sub = mdle.workflow$.subscribe((workflow) => {
                    const templateDiv = mdle.getOuterHTML()
                    const componentDiv = renderTemplate(
                        templateDiv,
                        mdle.getAllChildren(workflow),
                    )
                    const children = Array.from(componentDiv.children)
                    const toRemove = Array.from(
                        elem.parentElement.children,
                    ).slice(1)
                    toRemove.forEach((child) => child.remove)
                    children.forEach((child) =>
                        elem.parentElement.appendChild(child),
                    )
                })
                elem.ownSubscriptions(sub)
            },
        }
        render(virtualDOM)

        return render(virtualDOM)
    }
}
