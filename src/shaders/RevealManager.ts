import { RevealFilterController, RevealFilterNode, REVEAL_NODE_NAME } from './RevealFilter';

type Occluder = {
    sprite: Phaser.GameObjects.Image;
    filter: RevealFilterController | null;
};

export default class RevealManager {
    scene: Phaser.Scene;

    player!: Phaser.Physics.Matter.Sprite;

    radius = { x: 21, y: 31.5 };
    revealAlpha = 0.25;
    perfGateDist2 = 8000;

    occluders: Occluder[] = [];

    constructor(scene: Phaser.Scene) {
        this.scene = scene;
    }

    setPlayer(player: Phaser.Physics.Matter.Sprite) {
        this.player = player;
    }

    register(sprite: Phaser.GameObjects.Image) {
        const renderNodes = (this.scene.renderer as Phaser.Renderer.WebGL.WebGLRenderer).renderNodes;
        if (renderNodes && !renderNodes.hasNode(REVEAL_NODE_NAME)) {
            renderNodes.addNodeConstructor(REVEAL_NODE_NAME, RevealFilterNode);
        }

        sprite.enableFilters();

        let filter: RevealFilterController | null = null;
        if (sprite.filterCamera) {
            filter = sprite.filters!.internal.add(
                new RevealFilterController(sprite.filterCamera)
            ) as RevealFilterController;
            filter.setActive(false);
        }

        this.occluders.push({ sprite, filter });
    }

    update() {
        const px = this.player.x;
        // Shift the reveal ellipse's center up (screen-up = smaller world Y) by 40% of
        // its own vertical radius, so it sits over the player's body rather than feet.
        const py = this.player.y - 0.4 * this.radius.y;

        for (const { sprite, filter } of this.occluders) {
            if (!filter) continue;

            if (sprite.depth <= this.player.depth) {
                filter.setActive(false);
                continue;
            }

            const dx = sprite.x - px;
            const dy = sprite.y - py;
            const dist2 = dx * dx + dy * dy;

            if (dist2 > this.perfGateDist2) {
                filter.setActive(false);
                continue;
            }

            filter.setActive(true);
            filter.playerLocalX = (px - sprite.x) / (sprite.displayWidth / 2);
            filter.playerLocalY = (py - sprite.y) / (sprite.displayHeight / 2);
            filter.radiusX = this.radius.x / (sprite.displayWidth / 2);
            filter.radiusY = this.radius.y / (sprite.displayHeight / 2);
            filter.revealAlpha = this.revealAlpha;
        }
    }
}
