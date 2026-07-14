import Phaser from 'phaser';
import GameScene from '../scenes/GameScene';
import InteractButton from '../UI/InteractButton';

export default class Player extends Phaser.Physics.Matter.Sprite {
    private currPositionMarker: Phaser.GameObjects.Rectangle;
    public cursors!: Phaser.Types.Input.Keyboard.CursorKeys;
    public direction: string;
    private interactButton: InteractButton;
    public busy: boolean;

    constructor (scene: GameScene, x: number, y: number, texture: string, direction: string = "west") {
        super(scene.matter.world, x, y, texture);
        this.createAnimation();
        this.setOrigin(0.5, .8);
        this.currPositionMarker = this.scene.add.rectangle(this.x, this.y, 1, 1, 0xff0000).setDepth(99999);
        this.direction = direction;
        this.interactButton = new InteractButton(scene, "enter").setVisible(false);
        this.busy = false;

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
        this.updateInteract();
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

    interact() {
        const distance = 32;

        let targetX = this.x;
        let targetY = this.y;

        switch (this.direction) {
            case "west":
                targetX -= distance;
                break;

            case "east":
                targetX += distance;
                break;

            case "north":
                targetY -= distance;
                break;

            case "south":
                targetY += distance;
                break;

            case "northwest":
                targetX -= (2 / 3) * distance;
                targetY -= (1 / 3) * distance;
                break;

            case "northeast":
                targetX += (2 / 3) * distance;
                targetY -= (1 / 3) * distance;
                break;

            case "southwest":
                targetX -= (2 / 3) * distance;
                targetY += (1 / 3) * distance;
                break;

            case "southeast":
                targetX += (2 / 3) * distance;
                targetY += (1 / 3) * distance;
                break;
        }

        const target = this.scene.interactables.find(obj => {
            return Phaser.Math.Distance.Between(
                targetX,
                targetY,
                obj.x,
                obj.y
            ) < 16;
        });

        if (target) {
            target.interact(this);
        }
    }


    updateInteract() {
        const distance = 32;

        const directions: Record<string, { x: number; y: number }> = {
            west: { x: -1, y: 0 },
            east: { x: 1, y: 0 },
            north: { x: 0, y: -1 },
            south: { x: 0, y: 1 },
            northwest: { x: -2 / 3, y: -1 / 3 },
            northeast: { x: 2 / 3, y: -1 / 3 },
            southwest: { x: -2 / 3, y: 1 / 3 },
            southeast: { x: 2 / 3, y: 1 / 3 }
        };

        const dir = directions[this.direction];

        if (!dir) {
            this.interactButton.setVisible(false)
            return;
        }

        // Normalize direction vector
        const length = Math.sqrt(
            dir.x * dir.x + dir.y * dir.y
        );

        const targetX = this.x + (dir.x / length) * distance;
        const targetY = this.y + (dir.y / length) * distance;

        const target = this.scene.interactables.find(
            (obj: Phaser.GameObjects.Sprite) => {
                return Phaser.Math.Distance.Between(
                    targetX,
                    targetY,
                    obj.x,
                    obj.y
                ) < distance;
            }
        );

        if (target) {
            if (!this.busy) {
                this.interactButton.setVisible(true);
            }
            else {
                this.interactButton.setVisible(false)
            }
            if (Phaser.Input.Keyboard.JustDown(this.scene.enterKey)) {
                    this.busy = true;
                    target.interact(this);
            }
        } 
        else {
            this.interactButton.setVisible(false)
        }
    }


}