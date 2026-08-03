import NPC from "../npc/NPC"
import type GameScene from "../scenes/GameScene";
import { PIXEL_FONT_KEY, remapEmojiText, isEmojiGlyphCode } from "../utils/PixelBitmapFont";

export type DialogueLine = string | {
    text: string;
    fontSize?: number;
    italic?: boolean;
    bold?: boolean;
};

export default class TextBox {
    container: Phaser.GameObjects.Container;
    background: Phaser.GameObjects.Image;
    portrait: Phaser.GameObjects.Sprite;
    nameText: Phaser.GameObjects.BitmapText;
    dialogueText: Phaser.GameObjects.BitmapText;
    private typingEvent?: Phaser.Time.TimerEvent;
    private fullText = "";
    private currentIndex = 0;
    private isTyping = false;
    private dialogueIndex = 0;
    private scene: GameScene;
    // The pixel font's native 12px-tall glyph cell has only ~7px of visible
    // ink (rows reserved for ascenders/descenders), so these are scaled up
    // from the old canvas-text sizes (16/8) to keep the same apparent size.
    private readonly baseFontSize = 14;
    private readonly minFontSize = 1;
    private maxTextWidth = 0;
    private maxTextHeight = 0;
    constructor(scene: GameScene, npc: NPC) {

        this.scene = scene;
        const cam = scene.cameras.main;
        const zoom = cam.zoom;

        // Desired position as a fraction of the visible screen (0-1).
        const screenFracX = 1 / 2;
        const screenFracY = 4 / 5;

        // Camera zoom scales scrollFactor(0) objects too, and it zooms about
        // the camera's center, not (0,0). So a fixed screen position has to be
        // expressed as an offset from centerX/centerY, scaled by displayWidth/
        // displayHeight (the zoom-adjusted view size), to stay pinned in place
        // and at a fixed size on screen no matter what zoom the world camera uses.
        this.container = scene.add.container(
            cam.centerX + (screenFracX - 0.5) * cam.displayWidth,
            cam.centerY + (screenFracY - 0.5) * cam.displayHeight
        );

        this.container.setScrollFactor(0)
        .setScale(1);
        scene.renderLayers.ui.add(this.container);

        this.background = scene.add.image(
            0,
            0,
            "textbox"
        ).setScale(2);

        this.portrait = scene.add.sprite(
            -this.background.width / 1.36,
            0,
            npc.texture.key
        );

        const padding = 85;

        const scale = Math.min(
            (this.background.displayWidth * 0.3 - padding) / this.portrait.width,
            (this.background.displayHeight - padding) / this.portrait.height
        );

        const npcName = remapEmojiText(npc.name);

        this.nameText = scene.add.bitmapText(
            -this.background.displayWidth / 4.35,  // x relative to container
            -this.background.displayHeight / 2.6,  // y relative to container
            PIXEL_FONT_KEY,
            npcName,
            this.baseFontSize
        ).setTint(0x000000);
        this.applyEmojiColorTints(this.nameText, npcName);

        this.portrait.setScale(scale);

        this.portrait.play(`${npc.texture.key}-portrait`);


        const dialogueY = -this.background.displayHeight / 6;
        this.maxTextWidth = this.background.displayWidth * .67;
        this.maxTextHeight = this.background.displayHeight / 2.5 - dialogueY - 15;

        this.dialogueText = scene.add.bitmapText(
            -this.background.displayWidth / 4.36,
            dialogueY,
            PIXEL_FONT_KEY,
            "",
            this.baseFontSize
        )
            .setTint(0x000000)
            .setMaxWidth(this.maxTextWidth);

        this.container.add([
            this.background,
            this.portrait,
            this.nameText,
            this.dialogueText,
        ]);


    }

    setVisible(flag: boolean, npc: NPC) {
        this.container.setVisible(flag);
        this.typeText(npc.dialogue[0]!)
    }

    isVisible() {
        return this.container.visible;
    }


    nextDialogue(npc: NPC) {
        this.dialogueIndex++;

        if (this.dialogueIndex >= npc.dialogue.length) {
            this.dialogueIndex = 0;
            this.container.setVisible(false);
        }

        this.typeText(npc.dialogue[this.dialogueIndex]!);
    }

    typeText(line: DialogueLine) {
        // Stop any previous typing
        this.typingEvent?.remove();

        const text = remapEmojiText(typeof line === "string" ? line : line.text);
        const fontSize = typeof line === "string" ? this.baseFontSize : line.fontSize ?? this.baseFontSize;

        // Note: the pixel bitmap font has no bold/italic variant, so those
        // DialogueLine flags currently have no visual effect.
        this.dialogueText.setFontSize(this.fitFontSize(text, fontSize));

        // Wrap once against the full string so the typewriter reveals
        // already-decided line breaks instead of re-wrapping the growing
        // substring every tick (which made partial words jump to the next
        // line mid-type).
        this.fullText = this.dialogueText.setText(text).getTextBounds().wrappedText;
        this.applyEmojiColorTints(this.dialogueText, this.fullText);
        this.currentIndex = 0;
        this.isTyping = true;
        this.dialogueText.setText("");

        this.typingEvent = this.scene.time.addEvent({
            delay: 30, // milliseconds per letter
            repeat: this.fullText.length - 1,
            callback: () => {
                this.currentIndex++;
                this.dialogueText.setText(
                    this.fullText.substring(0, this.currentIndex)
                );

                if (this.currentIndex >= this.fullText.length) {
                    this.isTyping = false;
                }
            }
        });
    }

    // A BitmapText's global setTint(0x000000) (for plain black text) would
    // otherwise multiply the color emoji glyphs down to black too, so give
    // the emoji character positions their own 0xffffff (identity) tint,
    // which Phaser applies instead of the global one for those characters.
    // Indices are computed by walking `wrappedText` and skipping '\n', to
    // match how Phaser's own char-index counting (GetBitmapTextSize) works.
    private applyEmojiColorTints(target: Phaser.GameObjects.BitmapText, wrappedText: string) {
        target.setCharacterTint(0, -1);

        let charIndex = 0;
        for (const char of wrappedText) {
            if (char === "\n") {
                continue;
            }
            if (isEmojiGlyphCode(char.charCodeAt(0))) {
                target.setCharacterTint(charIndex, 1, undefined, 0xffffff);
            }
            charIndex++;
        }
    }

    private fitFontSize(text: string, startSize: number): number {
        let size = startSize;

        while (size > this.minFontSize) {
            this.dialogueText.setFontSize(size).setText(text);
            if (this.dialogueText.height <= this.maxTextHeight) {
                break;
            }
            size--;
        }

        return size;
    }
}