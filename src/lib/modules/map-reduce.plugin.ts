import {Flux,BuilderView, Schema} from '../module-flow/decorators'
import { GroupModules } from './group.module';
import { packCore } from './factory-pack-core';
import { ModuleFlow, PluginFlow, Pipe } from '../module-flow/models-base';
import { uuidv4 } from '../utils';
import * as _ from 'lodash'
import { freeContract } from '../module-flow/contract';
import { Context } from '../module-flow/context';


export namespace MapReduce {

   let icon = ``
   
    @Schema({
        pack: MapReduce,
        description: "Persistent Data of MapReduce"
    })
    export class PersistentData {

        constructor() {
        }
    }



    @Flux({
        pack: packCore,
        namespace: MapReduce,
        id: "MapReduce",
        displayName: "MapReduce",
        description: "A map reduce plugin on groups",
        compatibility: {
            Component: {
                condition: (mdle) => mdle instanceof GroupModules.Module,
                description: "A map reduce plugin should be associated to a group module"
            },
            Straight: {
                condition: (mdle:ModuleFlow) => mdle.inputSlots.length==1 &&  mdle.outputSlots.length==1,
                description: "A map reduce plugin should be associated to a group module with one input and one output"
            }
        }
    })
    @BuilderView({
        namespace: MapReduce,
        icon: icon
    })
    export class Module extends PluginFlow<GroupModules.Module> {
        
        runningCount:{[key:string]: number} = {}
        tmpAggregation: {[key:string]: Array<any>} = {}
        incomingContext: {[key:string]: any} = {}

        output$ : Pipe<any>
        
        constructor(params) { 
            super( params ) 
            this.addInput({ 
                id:'input', 
                description: "Map/Reduce an incoming array using the parent module",
                contract: freeContract(),
                onTriggered: this.map 
            })
            this.parentModule.explicitOutputs[0]
            .subscribe( ({data, context}) => {
                this.reduce(data, context)
            })
            this.output$ = this.addOutput( {id:'output'})
        }

        map(data: Array<any>, context: Context){

            if(!Array.isArray(data))
                throw Error("The MapReduce module is only accepting array as input")
            let groupId = uuidv4()
            this.runningCount[groupId] = data.length
            this.incomingContext[groupId] = _.cloneDeep(context.userContext)
            this.tmpAggregation[groupId] = []
            context.withChild(
                'send data to parent component', 
                (context) => {
                    data.forEach( d => {
                        this.parentModule.internalEntries[0].next({ data: d, context })
                    })
                },
                {_fluxLibCore:{_mapReduce:{groupId}}}
            )
        }

        reduce( data: any, context){

            let groupId = context._fluxLibCore._mapReduce.groupId
            this.tmpAggregation[groupId].push(data) 
            if(this.tmpAggregation[groupId].length == this.runningCount[groupId]){

                this.output$.next( {data:this.tmpAggregation[groupId], context:this.incomingContext[groupId] })
                delete this.incomingContext[groupId]
                delete this.tmpAggregation[groupId]
                delete this.runningCount[groupId]
            }
        }

    }
    let inputDescription = {
        description: `Data coming in should be an array`,
        mandatory: {
            description: "an array is expected",
            test: (input) => Array.isArray(input)
        }
    }
}
