import { Graph } from './graph'
import { SubscriptionStore } from '../module-flow/subscriptions-store'
import { Subscription } from 'rxjs'


export class Runner{

    subscriptionsStore = new SubscriptionStore()
    individualSubscriptions = new Array<Subscription>()

    constructor(readonly graph : Graph , readonly inputs : any = {}){

        this.subscriptionsStore.update(graph.workflow.modules, graph.workflow.connections,[] )
        graph.observers.forEach( obs => {
            if( obs.to.length == 0)
                return 
            let subscription = obs.from.subscribe( (d) => obs.to.map( observer => observer.next(d.data) ))
            this.individualSubscriptions.push(subscription )
        })
    }

    clearSubscriptions(){
        this.subscriptionsStore.clear()
    }

}
