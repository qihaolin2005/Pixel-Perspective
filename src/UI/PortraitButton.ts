import Phaser from "phaser";
import type GameScene from "../scenes/GameScene";

const PRESS_ANIM = "portrait_button-press";

// Measured off the sheet, in unscaled art pixels. Frame 0 reserves its bottom
// rows for the raised button's drop shadow, so the button body is centered this
// far above the frame's center -- portraits centered on the frame instead would
// ride low, overhanging the shadow.
const SHADOW_PX = 3;
// The art sinks the face by this much from frame 1 onward while the bottom edge
// stays put, so anything drawn on the face has to follow it down by hand -- the
// animation swaps frames, it does not move the container.
const FACE_SINK_PX = 2;
// Each 48x28 cell in the sheet is mostly transparent padding; this is the button
// you can actually see, centered in the cell. The tile sizes itself to this
// rather than to the frame, or its click target would spill far past the art --
// and at larger scales the two tiles' targets would overlap outright.
const ART_WIDTH_PX = 26;
const ART_HEIGHT_PX = 28;

// A single character-selection tile: the beveled button art, plus room for a
// player portrait sprite on top of it. It's a Container so the portrait rides
// along with the button and the whole tile is one click target.
export default class PortraitButton extends Phaser.GameObjects.Container {
    button: Phaser.GameObjects.Sprite;
    portrait?: Phaser.GameObjects.Sprite;

    private selected = false;
    // Not named `scale`: Container already owns that property, and shadowing it
    // would scale the whole tile instead of recording the art scale.
    private readonly artScale: number;
    private portraitRestY = 0;

    constructor(scene: GameScene, x: number, y: number, scale: number) {
        super(scene, x, y);

        this.artScale = scale;

        this.button = scene.add.sprite(0, 0, "portrait_button", 0).setScale(scale);
        this.add(this.button);
        scene.add.existing(this);

        this.createPressAnimation(scene);

        // A Container has no texture to derive a hit area from, so its size has
        // to be set explicitly first. scrollFactor matters here too: rendering
        // multiplies a child's scrollFactor by its parent container's, but hit
        // testing reads this object's own value, so a tile inside a pinned
        // (scrollFactor 0) panel needs its own 0 for the clickable region to
        // land where the button is actually drawn instead of trailing the
        // camera as it follows the player.
        this.setSize(ART_WIDTH_PX * scale, ART_HEIGHT_PX * scale);
        this.setScrollFactor(0);
        // The game swaps in its own cursor, so no hand cursor here -- the frame
        // change is what signals the button responded.
        this.setInteractive();

        this.button.on(Phaser.Animations.Events.ANIMATION_UPDATE, () => this.syncPortraitToFace());
        this.button.on(`animationcomplete-${PRESS_ANIM}`, () => this.syncPortraitToFace());
    }

    // Latches down and stays there. Whoever owns the group is responsible for
    // deselecting the others; a tile has no way to reach its siblings, and
    // giving it one would just be a group in disguise.
    select() {
        if (this.selected) {
            return;
        }

        this.selected = true;
        this.button.play(PRESS_ANIM);
    }

    // Runs the same frames backwards, so the button rises rather than snapping.
    deselect() {
        if (!this.selected) {
            return;
        }

        this.selected = false;
        this.button.playReverse(PRESS_ANIM);
    }

    isSelected() {
        return this.selected;
    }

    // Draws a portrait centered on the button body. `scale` is the portrait's
    // own, independent of the button's: the art is nearly as large as the face,
    // so a portrait drawn at the button's scale covers the bevel entirely.
    setPortrait(texture: string, scale = this.artScale) {
        this.portrait?.destroy();

        const portrait = this.scene.add.sprite(0, 0, texture).setScale(scale);
        this.portraitRestY = -(SHADOW_PX / 2) * this.artScale;

        this.portrait = portrait;
        this.add(portrait);
        this.syncPortraitToFace();

        return this;
    }

    // The portrait has to be moved down by hand to stay attached to the face as
    // it sinks, since the press animation only swaps frames. Frame 0 is the
    // raised state; every later frame has the face already sunk.
    private syncPortraitToFace() {
        if (!this.portrait) {
            return;
        }

        const sunk = Number(this.button.frame.name) > 0;
        this.portrait.setY(this.portraitRestY + (sunk ? FACE_SINK_PX * this.artScale : 0));
    }

    // Frames run raised -> pressed and the animation holds on whichever end it
    // finishes at, so a forward pass leaves the button down and a reverse pass
    // leaves it up. No yoyo: that would spring it back to raised immediately,
    // which is the one thing a latching button must not do.
    private createPressAnimation(scene: GameScene) {
        if (scene.anims.exists(PRESS_ANIM)) {
            return;
        }

        scene.anims.create({
            key: PRESS_ANIM,
            frames: scene.anims.generateFrameNumbers("portrait_button", {
                start: 0,
                end: 2
            }),
            frameRate: 12,
            repeat: 0
        });
    }
}
