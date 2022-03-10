/** @format */

import { Subscription } from 'rxjs'
import { instanceOfSideEffects } from '../models'
import { SubscriptionStore } from '../models/subscriptions-store'
import { Graph } from './graph'

export class Runner {
    subscriptionsStore = new SubscriptionStore()
    individualSubscriptions = new Array<Subscription>()

    constructor(readonly graph: Graph, readonly inputs: any = {}) {
        this.subscriptionsStore.update(
            graph.workflow.modules,
            graph.workflow.connections,
            [],
        )
        graph.workflow.modules.forEach((m) => {
            if (!instanceOfSideEffects(m)) {
                return
            }
            m.apply()
        })

        graph.observers.forEach((obs) => {
            if (obs.to.length == 0) {
                return
            }
            const subscription = obs.from.subscribe((d) =>
                obs.to.map((observer) => observer.next(d.data)),
            )
            this.individualSubscriptions.push(subscription)
        })
    }

    clearSubscriptions() {
        this.subscriptionsStore.clear()
    }
}
