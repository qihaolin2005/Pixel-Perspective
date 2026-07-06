export default class RevealManager {
    scene: Phaser.Scene;

    player!: Phaser.Physics.Matter.Sprite;

    radius = { x: 28, y: 42 };
    alpha = 0.25;

    occluders: Phaser.GameObjects.GameObject[] = [];

    constructor(scene: Phaser.Scene) {
        this.scene = scene;
    }

    setPlayer(player: Phaser.Physics.Matter.Sprite) {
        this.player = player;
    }

    register(obj: Phaser.GameObjects.GameObject) {
        this.occluders.push(obj);
    }

    update() {
        const px = this.player.x;
        const py = this.player.y;

        for (const sprite of this.occluders) {

            if (sprite.depth <= this.player.depth) {
                sprite.alpha = 1;
                continue;
            }

            const dx = sprite.x - px;
            const dy = sprite.y - py;

            const dist2 = dx * dx + dy * dy;

            if (dist2 < 1000) {
                sprite.alpha = 0.25;
            } else {
                sprite.alpha = 1;
            }
        }
    }
}