import Phaser from 'phaser';
import GameScene from '../scenes/GameScene';
import Player from '../player/Player';
import TextBox from '../UI/TextBox';

type Direction = 'north' | 'south' | 'east' | 'west' | 'northeast' | 'northwest' | 'southeast' | 'southwest';

const FACING_ANIMATION: Record<Direction, string> = {
    north: 'north',
    south: 'south',
    northeast: 'northeast',
    northwest: 'northwest',
    southeast: 'southeast',
    southwest: 'southwest',
    east: 'southwest',
    west: 'southeast',
};

export default class NPC extends Phaser.Physics.Matter.Sprite {
    public dialogue: string[];
    private dialogueIndex: number = 0;
    private dialogueBox?: Phaser.GameObjects.Rectangle | undefined;
    private dialogueText?: Phaser.GameObjects.Text | undefined;
    public name: string;
    private textBox: TextBox;

    constructor(scene: GameScene, x: number, y: number, texture: string, name: string, dialogue: string[]) {
        super(scene.matter.world, x, y, texture);

        this.dialogue = dialogue;

        scene.add.existing(this);
        this.createAnimation();
        this.setStatic(true);
        this.setDepth(this.y)

        this.name = name;
        this.textBox = new TextBox(this.scene as GameScene, this);
        this.textBox.setVisible(false, this);
    }

    interact(player: Player) {
        // const direction = this.getDirectionTo(player);
        // this.anims.play(FACING_ANIMATION[direction], true);

        if (this.dialogue.length === 0) {
            return;
        }
        else if (this.textBox.isVisible()){
            this.textBox.nextDialogue(this);
            if (!this.textBox.isVisible()) {
                player.busy = false;
            }
        }
        else {
            this.textBox.setVisible(true, this);
        }
    }


    private getDirectionTo(player: Player): Direction {
        const dx = player.x - this.x;
        const dy = player.y - this.y;
        const angle = Phaser.Math.RadToDeg(Math.atan2(dy, dx));

        if (angle >= -22.5 && angle < 22.5) return 'east';
        if (angle >= 22.5 && angle < 67.5) return 'southeast';
        if (angle >= 67.5 && angle < 112.5) return 'south';
        if (angle >= 112.5 && angle < 157.5) return 'southwest';
        if (angle >= -67.5 && angle < -22.5) return 'northeast';
        if (angle >= -112.5 && angle < -67.5) return 'north';
        if (angle >= -157.5 && angle < -112.5) return 'northwest';
        return 'west';
    }

    createAnimation() {
        const directions = [
            "south",
            "southwest",
            "southeast",
            "north",
            "northwest",
            "northeast"
        ];

        let current = 0;

        directions.forEach(direction => {
            const key = `${this.texture.key}-${direction}`;

            this.scene.anims.create({
                key,
                frames: this.scene.anims.generateFrameNumbers(this.texture.key, {
                    start: current,
                    end: current + 5
                }),
                frameRate: 10,
                repeat: -1
            });

            current += 6;
        });

        this.scene.anims.create({
        key: `${this.texture.key}-portrait`,
        frames: this.scene.anims.generateFrameNumbers(this.texture.key, {
            start: 0,  // south animation frames
            end: 5
        }),
        frameRate: 10,
        repeat: -1
    });
    }

    
    



}