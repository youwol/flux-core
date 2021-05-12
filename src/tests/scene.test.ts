import { Scene} from '../index'
import { createEmptyScene } from '../lib/models'

test('scene', () => {
    
    let ready = false
    let models = []
    let scene = createEmptyScene({
        id: (model) => model.id,     
        add: (model) => models.push(model),  
        remove:(model) => {models = models.filter( m=>m!=model.id)}, 
        ready: () => ready,
    })
    expect(scene).toBeDefined()

    scene = scene.add({id:"titi"})
    expect(scene.inScene.length).toEqual(0)
    expect(models.length).toEqual(0)

    ready = true        
    scene = scene.add({id:"tutu"})
    expect(scene.inScene.length).toEqual(2)
    expect(models.length).toEqual(2)

    scene = scene.add({id:"tutu"})
    expect(scene.inScene.length).toEqual(2)
    expect(models.length).toEqual(3)

    scene = scene.add({id:"tata"})
    expect(scene.inScene.length).toEqual(3)
    expect(models.length).toEqual(4)

    scene = scene.clearScene()
    expect(scene.inScene.length).toEqual(0)
})

