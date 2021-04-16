import { Connection,ModuleFlux } from './models-base';
import { Subscription } from 'rxjs';


export function subscribeConnections(  modules: Array<ModuleFlux>, connections: Array<Connection>,
    subscriptions: Map<Connection, Subscription>){

    let flatInputSlots  = modules.reduce( (acc,e)=> acc.concat(e.inputSlots) , [])
    let flatOutputSlots = modules.reduce( (acc,e)=> acc.concat(e.outputSlots) , [])

    connections.forEach( (c) => {
        let slotOut      = flatOutputSlots.find(slot => slot.slotId==c.start.slotId && slot.moduleId == c.start.moduleId )
        let slotIn       = flatInputSlots.find(slot => slot.slotId==c.end.slotId && slot.moduleId == c.end.moduleId )
        let subscription =   slotOut.observable$.subscribe(d => slotIn.subscribeFct({connection:c,message:d}) )
        subscriptions.set(c,subscription )
    })
}

export class SubscriptionStore{

    subscriptions = new Map<Connection, Subscription>()

    constructor(){}

    update(modules: Array<ModuleFlux>,createdConnections: Array<Connection>, removedConnections: Array<Connection>) {

        removedConnections.forEach( (c:Connection) => {
            this.subscriptions.get(c).unsubscribe()
            this.subscriptions.delete(c)
        })
        subscribeConnections(modules, createdConnections, this.subscriptions)
    }

    clear(){
        for( let subs of this.subscriptions.values()){
            subs.unsubscribe()
        }
        this.subscriptions.clear()
    }
}