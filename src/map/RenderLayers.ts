export default class RenderLayers {
    readonly floor: Phaser.GameObjects.Layer;
    readonly object: Phaser.GameObjects.Layer;
    readonly debug: Phaser.GameObjects.Layer;
    readonly ui: Phaser.GameObjects.Layer;
    private decoration = new Map<string, Phaser.GameObjects.Layer>();
    private nextDecorationDepth: number;

    constructor(scene: Phaser.Scene) {
        this.floor = scene.add.layer().setDepth(0);
        this.object = scene.add.layer().setDepth(1);
        this.debug = scene.add.layer().setDepth(500);
        this.ui = scene.add.layer().setDepth(1000);
        this.nextDecorationDepth = 2;
    }

    getDecorationLayer(scene: Phaser.Scene, name: string): Phaser.GameObjects.Layer {
        let layer = this.decoration.get(name);
        if (!layer) {
            layer = scene.add.layer().setDepth(this.nextDecorationDepth++);
            this.decoration.set(name, layer);
        }
        return layer;
    }
}
