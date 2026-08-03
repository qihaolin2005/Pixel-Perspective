import Phaser from 'phaser';
import GameScene from '../scenes/GameScene';
import Player from '../player/Player';
import TextBox, { type DialogueLine } from '../UI/TextBox';

type Direction = 'north' | 'south' | 'east' | 'west' | 'northeast' | 'northwest' | 'southeast' | 'southwest';

export default abstract class NPC extends Phaser.Physics.Matter.Sprite {
    public dialogue: DialogueLine[];
    public name: string;
    protected textBox: TextBox;

    constructor(scene: GameScene, x: number, y: number, texture: string, name: string, dialogue: DialogueLine[]) {
        super(scene.matter.world, x, y, texture);

        this.dialogue = dialogue;

        scene.add.existing(this);
        scene.renderLayers.object.add(this);
        this.createAnimation();
        this.setStatic(true);
        this.setDepth(this.y)

        this.name = name;
        this.textBox = new TextBox(this.scene as GameScene, this);
        this.textBox.setVisible(false, this);
    }

    abstract interact(player: Player) : any;


    protected getDirectionTo(player: Player): Direction {
        const dx = player.x - this.x;
        const dy = player.y - this.y;
        const angle = Phaser.Math.Angle.WrapDegrees(
            Phaser.Math.RadToDeg(Math.atan2(player.y - this.y, player.x - this.x))
        );

        let direction: Direction;

        if (angle >= -22.5 && angle < 22.5) direction = 'east';
        else if (angle >= 22.5 && angle < 67.5) direction = 'southeast';
        else if (angle >= 67.5 && angle < 112.5) direction = 'south';
        else if (angle >= 112.5 && angle < 157.5) direction = 'southwest';
        else if (angle >= -67.5 && angle < -22.5) direction = 'northeast';
        else if (angle >= -112.5 && angle < -67.5) direction = 'north';
        else if (angle >= -157.5 && angle < -112.5) direction = 'northwest';
        else direction = 'west';

        return direction;
    }

    abstract createAnimation(): void;
}