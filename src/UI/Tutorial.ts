import type GameScene from "../scenes/GameScene";
import PortraitButton from "./PortraitButton";

// Frame indices into the UI_Big_Play_Button sheet. Frames 0/1 are the blank
// variants of the same button, which this panel doesn't use.
const PLAY_IDLE_FRAME = 2;
const PLAY_PRESSED_FRAME = 3;

// next_button runs raised -> pressed like the other button sheets.
const NEXT_IDLE_FRAME = 0;
const NEXT_PRESSED_FRAME = 2;

// Greys PLAY out while it is locked. The sheet has no disabled frame of its
// own, and its spare frames are the blank-faced variants rather than a dimmed
// PLAY, so the state has to be tinted on.
const LOCKED_TINT = 0x8a8a8a;

// One tile per character. `texture` is hung on the tile under a data key of the
// same name, so whatever consumes the choice reads it off the button rather
// than tracking tile order.
const CHARACTERS = [
    { portrait: "MPlayer_portrait", texture: "male_player" },
    { portrait: "FPlayer_portrait", texture: "female_player" },
];

// Measured off the canvas art, in unscaled pixels. Both canvases reserve their
// top rows for the title and its rule and carry a border the whole way round,
// so content has to start clear of the one and stop short of the other.
const HEADER_PX = 28;
const BORDER_PX = 3;

export default class Tutorial {
    container: Phaser.GameObjects.Container;

    /** Page one: the input hints, and the button through to character select. */
    controlsPage: Phaser.GameObjects.Container;
    /** Page two: the character tiles and PLAY. */
    selectPage: Phaser.GameObjects.Container;

    // Assigned via the page builders the constructor calls, which the compiler
    // can't see through.
    /** WASD and ENTER, side by side under the CONTROLS header. */
    controls!: Phaser.GameObjects.Container;
    /** The WASD keys alone, in the usual inverted-T. */
    wasd!: Phaser.GameObjects.Container;
    enter!: Phaser.GameObjects.Sprite;
    nextButton!: Phaser.GameObjects.Sprite;

    /** Character-selection tiles, centered in the band above PLAY. */
    portraits!: PortraitButton[];
    playButton!: Phaser.GameObjects.Sprite;

    // All spacing below is in the background's own scaled pixels, so the canvas
    // art sets the unit and each element scales independently within it.
    private readonly artScale = 2;
    private readonly gap = 2;
    private readonly padding = 4;

    // The keys are only a hint, so they sit a scale below the canvas art to keep
    // the weight on the character tiles.
    private readonly keyScale = 1;

    // The tiles run a scale above the canvas art, and the portraits a scale
    // below them. That gap is what lets a 21x26 portrait sit inside the button's
    // 20x20 face with the bevel still visible around it -- at a shared scale the
    // portrait is always the taller of the two and swallows the whole face.
    private readonly tileScale = 3;
    private readonly portraitScale = 2;
    private readonly tileGap = 8;

    private panelHeight = 0;

    constructor(scene: GameScene, onPlay?: () => void) {

        const cam = scene.cameras.main;

        // Desired position as a fraction of the visible screen (0-1).
        const screenFracX = 1 / 2;
        const screenFracY = 1 / 2;

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

        this.controlsPage = this.buildControlsPage(scene);
        this.selectPage = this.buildSelectPage(scene, onPlay);

        this.container.add([this.controlsPage, this.selectPage]);

        this.setPlayLocked(true);
        this.showControls();
    }

    private buildControlsPage(scene: GameScene): Phaser.GameObjects.Container {
        const background = this.buildBackground(scene, "controls_canvas");

        this.wasd = this.buildWasd(scene);
        this.enter = this.buildKey(scene, "enter");
        this.controls = this.buildControlsRow(scene);
        this.nextButton = this.buildPressButton(
            scene, "next_button", NEXT_IDLE_FRAME, NEXT_PRESSED_FRAME,
            () => this.showSelect()
        );

        return scene.add.container(0, 0, [background, this.controls, this.nextButton]);
    }

    private buildSelectPage(scene: GameScene, onPlay?: () => void): Phaser.GameObjects.Container {
        const background = this.buildBackground(scene, "select_canvas");

        // PLAY first: the tiles center themselves in whatever room it leaves.
        this.playButton = this.buildPressButton(
            scene, "big_play_button", PLAY_IDLE_FRAME, PLAY_PRESSED_FRAME,
            () => onPlay?.()
        );
        this.portraits = this.buildPortraits(scene);

        return scene.add.container(0, 0, [background, ...this.portraits, this.playButton]);
    }

    private buildBackground(scene: GameScene, texture: string): Phaser.GameObjects.Image {
        const background = scene.add.image(0, 0, texture).setScale(this.artScale);
        this.panelHeight = background.displayHeight;
        return background;
    }

    /** Top of the usable area, below the canvas' title and rule. */
    private get contentTop(): number {
        return -this.panelHeight / 2 + HEADER_PX * this.artScale;
    }

    /** Bottom of the usable area, inside the canvas' border. */
    private get contentBottom(): number {
        return this.panelHeight / 2 - BORDER_PX * this.artScale - this.padding;
    }

    // W on its own row, centered over A/S/D beneath it. The container's origin
    // ends up at the center of that block so the row can treat it as one box.
    private buildWasd(scene: GameScene): Phaser.GameObjects.Container {
        const w = this.buildKey(scene, "key_w");
        const a = this.buildKey(scene, "key_a");
        const s = this.buildKey(scene, "key_s");
        const d = this.buildKey(scene, "key_d");

        // Every WASD sheet shares a frame size, so one key drives the spacing.
        const step = w.displayWidth + this.gap;
        const rowOffset = (w.displayHeight + this.gap) / 2;

        w.setPosition(0, -rowOffset);
        a.setPosition(-step, rowOffset);
        s.setPosition(0, rowOffset);
        d.setPosition(step, rowOffset);

        return scene.add.container(0, 0, [w, a, s, d]);
    }

    // The WASD block and ENTER flow left to right as one row, the pair centered
    // horizontally and tucked under the header.
    private buildControlsRow(scene: GameScene): Phaser.GameObjects.Container {
        const wasdBounds = this.wasd.getBounds();
        const items = [this.wasd, this.enter];
        const widths = [wasdBounds.width, this.enter.displayWidth];
        const heights = [wasdBounds.height, this.enter.displayHeight];

        const rowWidth = widths.reduce((sum, width) => sum + width, 0)
            + this.gap * (widths.length - 1);
        const rowHeight = Math.max(...heights);

        // Each item is vertically centered on the row so they share a midline
        // rather than sitting on a common baseline.
        let x = -rowWidth / 2;
        items.forEach((item, i) => {
            item.setPosition(x + widths[i]! / 2, 0);
            x += widths[i]! + this.gap;
        });

        return scene.add.container(0, this.contentTop + this.padding + rowHeight / 2, items);
    }

    // Tiles sit in a row centered in whatever vertical space the header and PLAY
    // leave between them, so resizing either one reflows them instead of
    // stranding them at a hard-coded y.
    private buildPortraits(scene: GameScene): PortraitButton[] {
        const bandBottom = this.playButton.y - this.playButton.displayHeight / 2;
        const y = (this.contentTop + bandBottom) / 2;

        const tiles = CHARACTERS.map(character => {
            const tile = new PortraitButton(scene, 0, y, this.tileScale)
                .setPortrait(character.portrait, this.portraitScale);

            tile.setData("texture", character.texture);
            tile.on("pointerdown", () => this.selectCharacter(tile));

            return tile;
        });

        // `width` is the visible button, not the padded sheet cell, so the tiles
        // space by the art you can actually see and click.
        const step = (tiles[0]?.width ?? 0) + this.tileGap;
        const left = -((tiles.length - 1) * step) / 2;
        tiles.forEach((tile, i) => tile.setX(left + i * step));

        return tiles;
    }

    // Sits against the bottom of the usable area and swaps frames on press.
    private buildPressButton(
        scene: GameScene,
        texture: string,
        idleFrame: number,
        pressedFrame: number,
        onPress: () => void
    ): Phaser.GameObjects.Sprite {
        const button = scene.add.sprite(0, 0, texture, idleFrame).setScale(this.artScale);
        button.setY(this.contentBottom - button.displayHeight / 2);

        // Hit testing reads this sprite's own scrollFactor, while rendering
        // multiplies it by the parent container's, so a button inside a pinned
        // panel needs its own 0 or its clickable region drifts with the camera.
        // Frames change on press rather than hover, so merely passing the cursor
        // over the button leaves it alone. pointerout still resets it, or
        // dragging off the button would strand it looking held down.
        // No hand cursor: the game installs its own pointer, and Phaser's
        // useHandCursor would swap it back to the browser's default arrow-hand
        // for exactly as long as you are over a button.
        button.setScrollFactor(0)
            .setInteractive()
            .on("pointerdown", () => button.setFrame(pressedFrame))
            .on("pointerout", () => button.setFrame(idleFrame))
            .on("pointerup", () => {
                button.setFrame(idleFrame);
                onPress();
            });

        return button;
    }

    // Held on frame 0, the unpressed frame. The sheets carry pressed frames too,
    // but a row of keys cycling on a loop pulls the eye away from the button the
    // panel is actually asking you to press.
    private buildKey(scene: GameScene, texture: string): Phaser.GameObjects.Sprite {
        return scene.add.sprite(0, 0, texture, 0).setScale(this.keyScale);
    }

    // Selection is exclusive and one-way: the chosen tile latches down and the
    // others rise. Clicking the tile that is already down does nothing, so there
    // is no way back to having no character picked once one has been.
    private selectCharacter(chosen: PortraitButton) {
        this.portraits.forEach(tile => {
            if (tile === chosen) {
                tile.select();
            } else {
                tile.deselect();
            }
        });

        this.setPlayLocked(false);
    }

    /** The chosen tile's `texture` label, or undefined before a choice is made. */
    get selectedCharacter(): string | undefined {
        return this.portraits.find(tile => tile.isSelected())?.getData("texture");
    }

    // PLAY starts locked so the panel can't be dismissed without a character.
    // Input is switched off rather than merely ignored, so a locked button
    // doesn't silently swallow presses while still looking live.
    private setPlayLocked(locked: boolean) {
        if (locked) {
            this.playButton.setTint(LOCKED_TINT).disableInteractive();
        } else {
            this.playButton.clearTint().setInteractive();
        }
    }

    // Only one page is up at a time. Phaser's hit testing walks a game object's
    // parents, so hiding a page also takes its buttons out of the input pass.
    showControls() {
        this.controlsPage.setVisible(true);
        this.selectPage.setVisible(false);
    }

    showSelect() {
        this.controlsPage.setVisible(false);
        this.selectPage.setVisible(true);
    }

    setVisible(flag: boolean) {
        this.container.setVisible(flag);
    }

    isVisible() {
        return this.container.visible;
    }

    destroy() {
        this.container.destroy(true);
    }
}
