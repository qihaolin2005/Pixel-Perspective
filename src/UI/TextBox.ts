import NPC from "../npc/NPC"
import type GameScene from "../scenes/GameScene";

export default class TextBox {
    container: Phaser.GameObjects.Container;
    background: Phaser.GameObjects.Image;
    portrait: Phaser.GameObjects.Sprite;
    nameText: Phaser.GameObjects.Text;
    dialogueText: Phaser.GameObjects.Text;
    private typingEvent?: Phaser.Time.TimerEvent;
    private fullText = "";
    private currentIndex = 0;
    private isTyping = false;
    private dialogueIndex = 0;
    private scene: GameScene;
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
        .setScale(1)
        .setDepth(9999);

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
        this.portrait = scene.add.sprite(
            -this.background.width / 1.36,
            0,
            npc.texture.key
        );

        this.nameText = scene.add.text(
            -this.background.displayWidth / 4.35,  // x relative to container
            -this.background.displayHeight / 2.6,  // y relative to container
            npc.name,
            {
                fontSize: "16px",
                color: "#000000",
                fontFamily: "PixelFont",
                fontStyle: "normal"
            }
        );

        this.portrait.setScale(scale);

        this.portrait.play(`${npc.texture.key}-portrait`);


        this.dialogueText = scene.add.text(
            -this.background.displayWidth / 4.36,
            -this.background.displayHeight / 6,
            "",
            {
                fontSize: "16px",
                color: "#000000",
                fontFamily: "PixelFont",
                wordWrap: {
                    width: this.background.displayWidth * 0.7
                }
            }
        );

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

    typeText(text: string) {
        // Stop any previous typing
        this.typingEvent?.remove();

        this.fullText = text;
        this.currentIndex = 0;
        this.isTyping = true;
        this.dialogueText.setText("");

        this.typingEvent = this.scene.time.addEvent({
            delay: 30, // milliseconds per letter
            repeat: text.length - 1,
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
}