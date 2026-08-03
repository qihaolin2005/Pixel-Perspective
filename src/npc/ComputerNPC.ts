import NPC from "./NPC";
import GameScene from "../scenes/GameScene";
import type Player from "../player/Player";
import { type DialogueLine } from "../UI/TextBox";

export default class ComputerNPC extends NPC{
    constructor(scene: GameScene, x: number, y: number, texture: string, name: string, dialogue: DialogueLine[]) {
        super(scene, x, y, texture, name, dialogue);
        this.setTexture('__DEFAULT');
    }

    interact(player: Player) {
        if (this.dialogue.length === 0) {
            return;
        }
        else if (this.textBox.isVisible()){
            this.textBox.nextDialogue(this);
            if (!this.textBox.isVisible()) {
                player.busy = false;
                window.open("assets/resume/resume.pdf", "_blank");
            }
        }
        else {
            this.textBox.setVisible(true, this);
        }
    }

    createAnimation(): void {
        this.scene.anims.create({
            key: `${this.texture.key}-portrait`,
            frames: this.scene.anims.generateFrameNumbers(this.texture.key, {
                start: 0,  // south animation frames
                end: 5
            }),
        });
    }
}