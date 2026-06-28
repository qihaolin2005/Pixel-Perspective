import Phaser from 'phaser';

export class Player extends Phaser.Physics.Arcade.Sprite {
    constructor (scene, x, y, texture) {
        super(scene, x, y, texture);
        this.scene = scene;
        this.createAnimation();
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

        let vx = 0;
        let vy = 0;

        let dir = 'none';

        if (this.cursors.up.isDown && this.cursors.left.isDown) {
            vx = -2/3 * speed;
            vy = -1/3 * speed;
            dir = 'northwest';
        }
        else if (this.cursors.up.isDown && this.cursors.right.isDown) {
            vx = 2/3 * speed;
            vy = -1/3 * speed;
            dir = 'northeast';
        }
        else if (this.cursors.down.isDown && this.cursors.left.isDown) {
            vx = -2/3 * speed;
            vy = 1/3 * speed;
            dir = 'southwest';
        }
        else if (this.cursors.down.isDown && this.cursors.right.isDown) {
            vx = 2/3 * speed;
            vy = 1/3 * speed;
            dir = 'southeast';
        }
        else if (this.cursors.left.isDown) {
            vx = -speed;
            dir = 'west';
        }
        else if (this.cursors.right.isDown) {
            vx = speed;
            dir = 'east';
        }
        else if (this.cursors.up.isDown) {
            vy = -speed;
            dir = 'north';
        }
        else if (this.cursors.down.isDown) {
            vy = speed;
            dir = 'south';
        }

        if (vx !== 0 || vy !== 0) {
            this.setVelocityX(vx);
            this.setVelocityY(vy);

            this.anims.play(dir, true);
        }
        else {
            this.anims.stop();
        }


    }

    createAnimation() {

        const directions = 
        ['west', 'east', 'south', 'north', 'southwest', 'southeast', 'northwest', 'northeast'];

        let current = 0;

        directions.forEach(direction => {
            this.anims.create({
                key: direction,
                frames: this.anims.generateFrameNumbers('player_walking', {
                    start: current,
                    end: current + 3,
                }),
                frameRate: 10,
                repeat: -1

            });
            current += 4
        })

    }


}