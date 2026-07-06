import Phaser from 'phaser';
import GameScene from '../scenes/GameScene';

export default class Player extends Phaser.Physics.Matter.Sprite {
    private currPositionMarker: Phaser.GameObjects.Rectangle;
    public cursors!: Phaser.Types.Input.Keyboard.CursorKeys;

    constructor (scene: GameScene, x: number, y: number, texture: string) {
        super(scene.matter.world, x, y, texture);
        this.createAnimation();
        this.setOrigin(0.5, .8);

        this.currPositionMarker = this.scene.add.rectangle(this.x, this.y, 1, 1, 0xff0000).setDepth(99999);      
    }

    addToScene() {
        this.scene.add.existing(this);
        this.setRectangle(12, 10, {
            render: { sprite: { xOffset: 0, yOffset: 0.3 } }
        });
        this.setFixedRotation();
        this.setFriction(0);
        this.setFrictionAir(0);
        this.cursors = this.scene.input.keyboard!.createCursorKeys();
    }

    debug(){
        this.currPositionMarker.x = this.x;
        this.currPositionMarker.y = this.y;
        

        
    }

    getCurrentLayer() {
        return 2;
    }

    update() {
        this.debug;
        this.setDepth(this.y);
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