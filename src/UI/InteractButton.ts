import GameScene from "../scenes/GameScene"
import Phaser from "phaser"
export default class InteractButton extends Phaser.GameObjects.Sprite {
    constructor(scene: GameScene, texture: string) {

        const cam = scene.cameras.main;
        const zoom = cam.zoom;

        // Desired position as a fraction of the visible screen (0-1).
        const screenFracX = 4 / 5;
        const screenFracY = 1 / 5;

        // Camera zoom scales scrollFactor(0) objects too, and it zooms about
        // the camera's center, not (0,0). So a fixed screen position has to be
        // expressed as an offset from centerX/centerY, scaled by displayWidth/
        // displayHeight (the zoom-adjusted view size), to stay pinned in place
        // and at a fixed size on screen no matter what zoom the world camera uses.
        super(scene, 
            cam.centerX + (screenFracX - 0.5) * cam.displayWidth,
            cam.centerY + (screenFracY - 0.5) * cam.displayHeight,
            texture
        )
        this.createAnimation();
        scene.add.existing(this);
         this.setScrollFactor(0)
            .setDepth(9999)
        this.play("loop");

    }

    createAnimation() {
        this.anims.create({
                key: "loop",
                frames: this.anims.generateFrameNumbers(this.texture.key, {
                    start: 0,
                    end: 2,
                }),
                frameRate: 3,
                repeat: -1

            });
    }
}