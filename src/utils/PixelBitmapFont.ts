import Phaser from "phaser";

// Native size (in atlas pixels) of a single glyph cell, taken from the
// monogram pixel-mask data: a 5px-wide monospace glyph in a 12px-tall cell
// (rows 0-2 are ascender headroom, rows 10-11 are descender headroom).
const CELL_WIDTH = 5;
const CELL_HEIGHT = 12;
const GLYPH_SPACING = 1;
const ADVANCE_SPACING = 1;
const COLUMNS = 16;
const FIRST_CHAR_CODE = 32;
const LAST_CHAR_CODE = 126;

// Emoji glyphs are baked lazily (the first time a given emoji is typed) into
// a reserved grid below the ASCII cells, since we don't know the full set of
// dialogue text up front. Slots are square and bigger than an ASCII cell so
// multi-part emoji glyphs stay legible. 64 slots is far more than the
// dialogue currently uses; if it's ever exhausted, new emoji are dropped.
const EMOJI_CELL_SIZE = 12;
const EMOJI_COLUMNS = 8;
const EMOJI_ROWS = 8;
const MAX_EMOJI_GLYPHS = EMOJI_COLUMNS * EMOJI_ROWS;
const EMOJI_CELL_STRIDE = EMOJI_CELL_SIZE + GLYPH_SPACING;
const PUA_FIRST_CODE = 0xE000;

export const PIXEL_FONT_KEY = "monogramPixel";

type CharacterData = Phaser.Types.GameObjects.BitmapText.BitmapFontCharacterData & { xAdvance: number };

// Module-level because the font is a singleton (guarded below): only one
// scene builds/owns it at a time, so these just point at its live pieces.
let canvasCtx: CanvasRenderingContext2D | null = null;
let emojiTexture: Phaser.Textures.CanvasTexture | null = null;
let fontChars: Record<number, CharacterData> | null = null;
let emojiRegionY = 0;
const emojiCodeByGrapheme = new Map<string, number>();
let nextEmojiSlot = 0;

/**
 * Whether `charCode` is one of the PUA codes remapEmojiText() hands out for
 * baked emoji glyphs (as opposed to the flat-filled ASCII glyphs).
 *
 * BitmapText's global `setTint` multiplies every glyph's pixel color,
 * including these color emoji ones, which is why the dialogue box tinting
 * text black was also crushing emoji to black. Callers use this to find the
 * emoji character positions and give them a per-character 0xffffff tint
 * (identity under MULTIPLY) via setCharacterTint, which Phaser applies
 * instead of the object's global tint for those characters.
 */
export function isEmojiGlyphCode(charCode: number): boolean {
    return charCode >= PUA_FIRST_CODE && charCode < PUA_FIRST_CODE + MAX_EMOJI_GLYPHS;
}

function isBakedAsciiChar(char: string): boolean {
    const code = char.charCodeAt(0);
    return code >= FIRST_CHAR_CODE && code <= LAST_CHAR_CODE;
}

function bakeEmojiGlyph(grapheme: string, slot: number): number {
    const code = PUA_FIRST_CODE + slot;

    if (!canvasCtx || !emojiTexture || !fontChars) {
        return code;
    }

    const col = slot % EMOJI_COLUMNS;
    const row = Math.floor(slot / EMOJI_COLUMNS);
    const cellX = col * EMOJI_CELL_STRIDE;
    const cellY = emojiRegionY + row * EMOJI_CELL_STRIDE;

    // Unlike the ASCII glyphs above (flat-filled from a 1-bit mask), emoji
    // need real color/anti-aliasing, so this draws through the browser's
    // normal emoji font instead of the fillRect-per-pixel approach.
    canvasCtx.font = `${EMOJI_CELL_SIZE}px sans-serif`;
    canvasCtx.textAlign = "center";
    canvasCtx.textBaseline = "middle";
    canvasCtx.fillText(grapheme, cellX + EMOJI_CELL_SIZE / 2, cellY + EMOJI_CELL_SIZE / 2 + 1);

    const frame = emojiTexture.add(String(code), 0, cellX, cellY, EMOJI_CELL_SIZE, EMOJI_CELL_SIZE)!;

    fontChars[code] = {
        x: 0,
        y: 0,
        width: EMOJI_CELL_SIZE,
        height: EMOJI_CELL_SIZE,
        centerX: Math.floor(EMOJI_CELL_SIZE / 2),
        centerY: Math.floor(EMOJI_CELL_SIZE / 2),
        xOffset: 0,
        yOffset: 0,
        xAdvance: EMOJI_CELL_SIZE + ADVANCE_SPACING,
        data: {},
        kerning: {},
        u0: frame.u0,
        v0: frame.v0,
        u1: frame.u1,
        v1: frame.v1
    };

    emojiTexture.refresh();

    return code;
}

/**
 * Replaces each emoji (or other non-ASCII grapheme cluster) in `text` with a
 * single Private Use Area character backed by a lazily-baked glyph.
 *
 * This exists because Phaser's BitmapText walks a string one UTF-16 code
 * unit at a time (see GetBitmapTextSize.js), not one Unicode codepoint at a
 * time. Most emoji are surrogate pairs, and many share the same high
 * surrogate (e.g. every emoji in U+1F400-U+1F7FF), so baking glyphs keyed by
 * raw char code would either split an emoji across two glyph cells or make
 * unrelated emoji collide. Remapping each full grapheme cluster to its own
 * single-code-unit PUA character sidesteps both problems.
 */
export function remapEmojiText(text: string): string {
    if (!/[^\x00-\x7F]/.test(text)) {
        return text;
    }

    const segmenter = new Intl.Segmenter(undefined, { granularity: "grapheme" });
    let result = "";

    for (const { segment } of segmenter.segment(text)) {
        if (segment.length === 1 && isBakedAsciiChar(segment)) {
            result += segment;
            continue;
        }

        let code = emojiCodeByGrapheme.get(segment);

        if (code === undefined) {
            if (nextEmojiSlot >= MAX_EMOJI_GLYPHS) {
                continue;
            }

            code = bakeEmojiGlyph(segment, nextEmojiSlot);
            emojiCodeByGrapheme.set(segment, code);
            nextEmojiSlot++;
        }

        result += String.fromCharCode(code);
    }

    return result;
}

/**
 * Builds a Phaser bitmap font at runtime from monogram's raw per-glyph pixel
 * masks (assets/fonts/monogram/bitmap/monogram-bitmap.json), instead of
 * rendering the TTF through canvas fillText. fillText always anti-aliases
 * glyph edges, which NEAREST texture filtering can't undo - baking the
 * glyphs as flat-filled rects avoids soft edges entirely.
 */
export function createPixelBitmapFont(scene: Phaser.Scene, jsonKey: string): void {
    if (scene.cache.bitmapFont.has(PIXEL_FONT_KEY)) {
        return;
    }

    const glyphMasks = scene.cache.json.get(jsonKey) as Record<string, number[]>;

    const codes: number[] = [];
    for (let code = FIRST_CHAR_CODE; code <= LAST_CHAR_CODE; code++) {
        if (glyphMasks[String.fromCharCode(code)]) {
            codes.push(code);
        }
    }

    const cellStrideX = CELL_WIDTH + GLYPH_SPACING;
    const cellStrideY = CELL_HEIGHT + GLYPH_SPACING;
    const rows = Math.ceil(codes.length / COLUMNS);
    const asciiRegionHeight = rows * cellStrideY;

    const canvas = document.createElement("canvas");
    canvas.width = Math.max(COLUMNS * cellStrideX, EMOJI_COLUMNS * EMOJI_CELL_STRIDE);
    canvas.height = asciiRegionHeight + EMOJI_ROWS * EMOJI_CELL_STRIDE;

    const ctx = canvas.getContext("2d")!;
    ctx.fillStyle = "#ffffff";

    const texture = scene.textures.addCanvas(PIXEL_FONT_KEY, canvas)!;

    // Phaser's type defs omit `xAdvance` even though the runtime (GetBitmapTextSize.js)
    // reads it directly off each glyph to lay out characters along a line.
    const chars: Record<number, CharacterData> = {};

    codes.forEach((code, index) => {
        const col = index % COLUMNS;
        const row = Math.floor(index / COLUMNS);
        const cellX = col * cellStrideX;
        const cellY = row * cellStrideY;

        const mask = glyphMasks[String.fromCharCode(code)]!;
        mask.forEach((bits, y) => {
            for (let x = 0; x < CELL_WIDTH; x++) {
                if (bits & (1 << x)) {
                    ctx.fillRect(cellX + x, cellY + y, 1, 1);
                }
            }
        });

        const frame = texture.add(String(code), 0, cellX, cellY, CELL_WIDTH, CELL_HEIGHT)!;

        chars[code] = {
            x: 0,
            y: 0,
            width: CELL_WIDTH,
            height: CELL_HEIGHT,
            centerX: Math.floor(CELL_WIDTH / 2),
            centerY: Math.floor(CELL_HEIGHT / 2),
            xOffset: 0,
            yOffset: 0,
            xAdvance: CELL_WIDTH + ADVANCE_SPACING,
            data: {},
            kerning: {},
            u0: frame.u0,
            v0: frame.v0,
            u1: frame.u1,
            v1: frame.v1
        };
    });

    texture.refresh();

    scene.cache.bitmapFont.add(PIXEL_FONT_KEY, {
        data: {
            font: PIXEL_FONT_KEY,
            size: CELL_HEIGHT,
            lineHeight: CELL_HEIGHT,
            chars
        },
        texture: PIXEL_FONT_KEY,
        frame: null
    });

    canvasCtx = ctx;
    emojiTexture = texture;
    fontChars = chars;
    emojiRegionY = asciiRegionHeight;
}
