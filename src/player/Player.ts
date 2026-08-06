import Phaser from 'phaser';
import GameScene from '../scenes/GameScene';
import InteractButton from '../UI/InteractButton';

// Named by direction rather than by letter, so the movement logic reads as
// up/left/down/right no matter which keys end up bound to them.
export type MovementKeys = {
    up: Phaser.Input.Keyboard.Key;
    down: Phaser.Input.Keyboard.Key;
    left: Phaser.Input.Keyboard.Key;
    right: Phaser.Input.Keyboard.Key;
};

export default class Player extends Phaser.Physics.Matter.Sprite {
    private currPositionMarker: Phaser.GameObjects.Rectangle;
    public keys!: MovementKeys;
    public direction: string;
    private interactButton: InteractButton;
    private textureKey: string;
    public busy: boolean;
    

    constructor (scene: GameScene, x: number, y: number, texture: string, direction: string = "west") {
        super(scene.matter.world, x, y, `${texture}_idle`);
        this.textureKey = texture;
        this.createAnimation();
        this.direction = direction;
        this.interactButton = new InteractButton(scene, "enter").setVisible(false);
        this.busy = false;
    }

    addToScene() {
        this.scene.add.existing(this);
        (this.scene as GameScene).renderLayers.object.add(this);
        this.setRectangle(12, 10, {
            render: { sprite: { xOffset: 0, yOffset: 0.3 } },
            label: "player",
        });
        this.setFixedRotation();
        this.setFriction(0);
        this.setFrictionAir(0);
        this.scene.matter.world.on('afterupdate', this.snapWhenStill);
        // WASD rather than the arrow keys, matching what the tutorial teaches.
        this.keys = this.scene.input.keyboard!.addKeys({
            up: Phaser.Input.Keyboard.KeyCodes.W,
            left: Phaser.Input.Keyboard.KeyCodes.A,
            down: Phaser.Input.Keyboard.KeyCodes.S,
            right: Phaser.Input.Keyboard.KeyCodes.D,
        }) as MovementKeys;
    }

    debug(){
        if (this.scene.matter.world.drawDebug) {
            if (!this.currPositionMarker) {
                this.currPositionMarker = this.scene.add.rectangle(this.x, this.y, 1, 1, 0xff0000);
                (this.scene as GameScene).renderLayers.debug.add(this.currPositionMarker);
            }
            this.currPositionMarker.x = this.x;
            this.currPositionMarker.y = this.y;
        }
    }

    getCurrentLayer() {
        return 2;
    }

    // Matter's position solver ejects overlapping bodies by fractional amounts, so spawning on
    // top of collision geometry - which every room transition does - leaves the body a fraction
    // of a pixel off with nothing to pull it back. Two constraints on where this can run:
    // 'afterupdate', because a snap in the scene update phase is undone by the step that
    // follows it; and only while standing still, because rounding every frame would discard
    // the remainder that normalized diagonal movement carries, flattening 2:1 to 45 degrees.
    private snapWhenStill = () => {
        const velocity = (this.body as MatterJS.BodyType).velocity;
        if (velocity.x !== 0 || velocity.y !== 0) {
            return;
        }
        const x = Math.round(this.x);
        const y = Math.round(this.y);
        if (x !== this.x || y !== this.y) {
            this.setPosition(x, y);
        }
    }

    update() {
        this.debug();
        this.setDepth(this.y + 5);
        this.updateInteract();
    }

    createAnimation() {
        const directions = 
        ['west', 'east', 'south', 'north', 'southwest', 'southeast', 'northwest', 'northeast'];

        let current = 0;

        directions.forEach(direction => {
            this.anims.create({
                key: `walking-${direction}`,
                frames: this.anims.generateFrameNumbers(`${this.textureKey}_walking`, {
                    start: current,
                    end: current + 3,
                }),
                frameRate: 10,
                repeat: -1

            });
            this.anims.create({
                key: `idle-${direction}`,
                frames: this.anims.generateFrameNumbers(`${this.textureKey}_idle`, {
                    start: current,
                    end: current + 3,
                }),
                frameRate: 10,
                repeat: -1

            });
            current += 4
        });

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