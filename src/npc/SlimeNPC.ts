import Phaser from 'phaser';
import GameScene from '../scenes/GameScene';
import Player from '../player/Player';
import TextBox, { type DialogueLine } from '../UI/TextBox';
import NPC, { type Direction } from './NPC';


const FACING_ANIMATION: Record<Direction, string> = {
    north: 'north',
    south: 'south',
    northeast: 'northeast',
    northwest: 'northwest',
    southeast: 'southeast',
    southwest: 'southwest',
    east: 'southeast',
    west: 'southwest',
};

export default class SlimeNPC extends NPC {

    constructor(scene: GameScene, x: number, y: number, texture: string, name: string, dialogue: DialogueLine[]) {
        super(scene, x, y, texture, name, dialogue);
    }

    interact(player: Player) {
        const direction = this.getDirectionTo(player);
        this.anims.play(`${this.texture.key}-${FACING_ANIMATION[direction]}`, true);

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