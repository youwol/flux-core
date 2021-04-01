import  * as operators from 'rxjs/operators'

import {ModuleTest, PluginTest} from './test-modules'
import { ModuleConfiguration,SlotRef, Connection, Adaptor, AdaptorConfiguration } from '../index'

console.log = () =>{}

test('Module', (done) => {

    let configuration = new ModuleConfiguration({
        title:'title', 
        description:'description', 
        data: new ModuleTest.PersistentData()
    })
    let moduleId= 'toto'
    let environment = {}
    let Factory = ModuleTest
    let mdle = new ModuleTest.Module( { moduleId, configuration, Factory, environment })
    mdle.cache.maxCount = 2

    expect(mdle.moduleId).toEqual('toto')
    expect(mdle.inputSlots.length).toEqual(1)
    expect(mdle.outputSlots.length).toEqual(1)

    let c = new Connection(new SlotRef("id0","module0"),new SlotRef("id1","module1"))

    mdle.outputSlots[0].observable$.pipe(
        operators.take(1)
    ).subscribe( ({data, configuration, context}) => {
        expect(data.value).toEqual(4)
        expect(context.fromCache).toEqual(false)
    })
    mdle.outputSlots[0].observable$.pipe(
        operators.skip(1),
        operators.take(1)
    ).subscribe( ({data, configuration, context}) => {
        expect(data.value).toEqual(4)
        expect(context.fromCache).toEqual(true)
    })
    mdle.outputSlots[0].observable$.pipe(
        operators.skip(1),
        operators.take(1)
    ).subscribe( ({data, configuration, context}) => {
        expect(data.value).toEqual(4)
        expect(context.fromCache).toEqual(true)
        done()
    })

    let d = {connection:c, data :{ data:{ value: 2 } , configuration: {}, context:{}}}
    mdle.inputSlots[0].subscribeFct(d ) 
    mdle.inputSlots[0].subscribeFct(d ) 
    mdle.inputSlots[0].subscribeFct({connection:c, data :{ data:{ value: 2 } , configuration: {}, context:{}}} ) 

})



test('Module with adaptor', (done) => {


    let configuration = new ModuleConfiguration({
        title:'title', 
        description:'description', 
        data: new ModuleTest.PersistentData()
    })
    let environment = {}
    let Factory = ModuleTest
    let mdle = new ModuleTest.Module( { configuration, Factory, environment })

    expect(mdle.moduleId.split('-').length).toEqual(5)

    mdle.cache.maxCount = 2

    let code = ` 
    return ({data,configuration,context}) => ({
        data:  { value: data.value *2 },
        context:{ adapted: true },
        configuration: configuration
    })
    `
    let adaptConf = new AdaptorConfiguration("simple adaptor", "description", { code })

    let c = new Connection(new SlotRef("id0","module0"),new SlotRef("id1","module1"), new Adaptor("adapt0",adaptConf))

    mdle.outputSlots[0].observable$.pipe(
        operators.take(1)
    ).subscribe( ({data, configuration, context}) => {
        expect(data.value).toEqual(16)
        expect(context.fromCache).toEqual(false)
        done()
    })
    mdle.inputSlots[0].subscribeFct({connection:c, data :{ data:{ value: 2 } , configuration: {}, context:{}}} ) 

})



test('Plugin test', () => {


    let configuration = new ModuleConfiguration({
        title:'title', 
        description:'description', 
        data: new PluginTest.PersistentData()
    })
    let moduleId= 'toto'
    let environment = {}
    let Factory = PluginTest
    let parent = new ModuleTest.Module( { moduleId, configuration, Factory, environment })
    let plugin = new PluginTest.Module( { parent, moduleId:"pluginId", configuration, Factory, environment })

})
