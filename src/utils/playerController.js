import Phaser from 'phaser';

export class Player extends Phaser.Physics.Arcade.Sprite {
    constructor (scene, x, y, texture) {
        super(scene, x, y, texture);
        this.scene = scene;
    }

    addToScene() {
        this.scene.add.existing(this);
        this.scene.physics.add.existing(this);

        // this.setCollideWorldBounds(true);
        this.cursors = this.scene.input.keyboard.createCursorKeys();

    }

    update() {
        const speed = 150;
        this.setVelocity(0);
        if (this.cursors.left.isDown && this.cursors.up.isDown) {
            this.setVelocityX(-(2/3 * speed));
            this.setVelocityY(-(1/3 * speed));
        }
        else if (this.cursors.left.isDown) {
            this.setVelocityX(-speed);
        }
        else if (this.cursors.right.isDown) {
            this.setVelocityX(speed);
        }
        else if (this.cursors.up.isDown) {
            this.setVelocityY(-speed);
        }
        else if (this.cursors.down.isDown) {
            this.setVelocityY(speed);
        }
    }


}