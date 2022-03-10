/** @format */

import { createEmptyScene } from '../lib/models'

test('scene', () => {
    let ready = false
    let models = []
    let scene = createEmptyScene({
        id: (model) => model.id,
        add: (model) => models.push(model),
        remove: (model) => {
            models = models.filter((m) => m != model.id)
        },
        ready: () => ready,
    })
    expect(scene).toBeDefined()

    scene = scene.add({ id: 'titi' })
    expect(scene.inScene).toHaveLength(0)
    expect(models).toHaveLength(0)

    ready = true
    scene = scene.add({ id: 'tutu' })
    expect(scene.inScene).toHaveLength(2)
    expect(models).toHaveLength(2)

    scene = scene.add({ id: 'tutu' })
    expect(scene.inScene).toHaveLength(2)
    expect(models).toHaveLength(3)

    scene = scene.add({ id: 'tata' })
    expect(scene.inScene).toHaveLength(3)
    expect(models).toHaveLength(4)

    scene = scene.clearScene()
    expect(scene.inScene).toHaveLength(0)
})
