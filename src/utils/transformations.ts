
export function calculateOffset(mapWidth: integer, mapHeight: integer, tilePixel: number) {
    return Math.abs(mapWidth - mapHeight) * (tilePixel / 2);
}
/**
 * 
 * @param {*} {x, y} an object where x and y are isometric coordinates
 * @param {*} tileWidth width of the tile
 * @param {*} tileHeight height of the tile
 * @param {*} xOffset calculated xOffset
 * @returns an object {x, y} where x and y are World Pixels
 */
export function isoCoordsToWorld({x, y, tileWidth, tileHeight}:
     { x: number; y: number; tileWidth: number; tileHeight: number }, xOffset: number) {
    return {
        x: (x - y) * (tileWidth / 2) + xOffset,
        y: (x + y) * (tileHeight / 2),
    };
}

/**
 * Transforms the tiled pixels from tiled to tiled coordinates.
 * This results in isometric coordinates.
 * @param {*} x isometric pixel
 * @param {*} y isometric pixel
 * @param {*} tileWidth width of the tile
 * @param {*} tileHeight height of the tile
 * @returns x and y as isometric tiled coordinates
 */
export function TiledPixelsToCoords (x: number, y: number, tileWidth: number, tileHeight: number) {
    return {
        x : x / (tileWidth / 2),
        y : y / tileHeight,
        tileWidth: tileWidth,
        tileHeight: tileHeight,
    };
}

/**
 * Transforms a Tiled rectangle object (x, y, width, height, all in Tiled pixel space)
 * into its four corners in isometric world space. Tiled applies the same iso shear to
 * rectangle objects that it does to everything else, so an axis-aligned rectangle
 * renders as a rotated parallelogram - transforming each corner individually (rather
 * than just the center) reproduces that shear.
 */
export function isoRectVertices(
    x: number, y: number, width: number, height: number,
    tileWidth: number, tileHeight: number, xOffset: number
): { x: number; y: number }[] {
    const corners = [
        { x, y },
        { x: x + width, y },
        { x: x + width, y: y + height },
        { x, y: y + height },
    ];

    return corners.map(corner => {
        const isoCoords = TiledPixelsToCoords(corner.x, corner.y, tileWidth, tileHeight);
        return isoCoordsToWorld(isoCoords, xOffset);
    });
}

export function worldToIsoCoords(x: number, y: number, tileWidth: number, tileHeight: number, xOffset: number) {
    const xMinusY = (x - xOffset) / (tileWidth / 2);
    const xplusY = y / (tileHeight / 2);

    x = (xMinusY + xplusY) / 2;
    y = x - xMinusY;

    return {
        x : Math.floor(x) - 1,
        y : Math.floor(y),
    };
}