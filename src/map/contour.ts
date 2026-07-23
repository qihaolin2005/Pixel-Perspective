export function generatePoints(layers: Phaser.Tilemaps.LayerData[]) {

    layers.forEach(layer => {
        const data = layer.data;
        const pointMap = new Map<string, {i: number, j: number}>()
        for (let i = 0; i < data.length; i++) {
            for (let j = 0; j < data[i]!.length; j++) {
                const currTile = data[i]![j];
                if (currTile!.index == -1)
                    continue;
                //check top edge;
                if (i - 1 == -1 || data[i - 1]![j]!.index == -1)
                    pointMap.set(`${i},${j}`, {i: i, j: j + 1})
                if (j - 1 == -1 || data[i]![j - 1]!.index == -1)
                    pointMap.set(`${i + 1},${j}`, {i: i, j: j})
                if (i + 1 ==  data.length || data[i + 1]![j]!.index == -1)
                    pointMap.set(`${i + 1},${j + 1}`, {i: i + 1, j: j})
                if (j + 1 ==  data[i]!.length || data[i]![j + 1]!.index == -1)
                    pointMap.set(`${i},${j + 1}`, {i: i + 1, j: j + 1})
                
            }
        }
        console.log(pointMap);
        console.log(data.length);

    });
}

/**
 * DOES NOT WORK WITH AN OFFSET OR LAYERS WITH DIFFERENT SIZE
 * 
 * @param layerTop 
 * @param layerBot 
 */
export function CreateTransitionLayer(layerTop: Phaser.Tilemaps.LayerData, layerBot: Phaser.Tilemaps.LayerData) {
    const topData = layerTop.data as Phaser.Tilemaps.Tile[][];
    const botData = layerBot.data as Phaser.Tilemaps.Tile[][];

   const mergeData: Phaser.Tilemaps.Tile[][] =
    Array.from({ length: topData.length }, (_, i) =>
        Array.from({ length: topData[i]!.length }, (_, j) =>
            topData[i]![j]!
        )
    );
    
    for (let i = 0; i < topData.length; i++) {
        for (let j = 0; j < topData[i]!.length; j++) {
            const topTile = topData[i]?.[j];
            const botTile = botData[i]?.[j];
            if (!topTile) {
                throw new Error(`Missing top tile at (${i}, ${j})`);
            }
            if (!botTile) {
                throw new Error(`Missing botom tile at (${i}, ${j})`);
            }

            if (topTile.index === -1) {
                mergeData[i]![j] = botTile;
            }
            else {
                mergeData[i]![j] = topTile;
            }
        }
    }

    const mergeLayerData: Phaser.Tilemaps.LayerData = {
        ...layerTop,
        name: layerTop.name + ' ' + layerBot.name,
        data: mergeData
    };

    return mergeLayerData;



}

export function generateEdges(layers: Phaser.Tilemaps.LayerData[]) {
    const points: Edge[][] = [];
    layers.forEach(layer => {
        const data = layer.data;
        const pointArr: Edge[] = [];
        for (let i = 0; i < data.length; i++) {
            let rectTop = null;
            let rectBot = null;
            for (let j = 0; j < data[i]!.length; j++) {
                const currTile = data[i]![j]!;
                const offsets = getOffset(currTile);
                if (!checkValidFloorTile(currTile)) {
                    rectTop = flushEdge(rectTop, pointArr);
                    rectBot = flushEdge(rectBot, pointArr);
                }
                else {
                    if (i == 0 || !checkValidFloorTile(data[i - 1]![j]!)) {
                        if (!rectTop) {
                            //rectTop = {startX : j, startY: i, endX: j + 1, endY: i, dir: 'top'};
                            rectTop = createRect(j, i, j + 1, i, 'top', offsets);
                        }
                        else {
                            rectTop.endX = j + 1 + offsets.xOffset;
                        }
                    }
                    else {
                        rectTop = flushEdge(rectTop, pointArr);
                    }

                    if (i == data.length - 1 || !checkValidFloorTile(data[i + 1]![j]!)) {
                        if (!rectBot) {
                            rectBot = createRect(j, i + 1, j + 1, i + 1, 'bot', offsets);
                            //rectBot = {startX : j, startY: i + 1, endX: j + 1, endY: i + 1, dir: 'bottom'};
                        }
                        else {
                            rectBot.endX = j + 1 + offsets.xOffset;
                        }
                    }
                    else {
                        rectBot = flushEdge(rectBot, pointArr);
                    }
                }
                
            }
            rectTop = flushEdge(rectTop, pointArr);
            rectBot = flushEdge(rectBot, pointArr);
        }

        for (let j = 0; j < data[0]!.length; j++) {
            let rectLeft = null;
            let rectRight = null;
            for (let i = 0; i < data.length; i++) {
                const currTile = data[i]![j]!;
                const offsets = getOffset(currTile);
                
                if (!checkValidFloorTile(currTile)) {
                    rectLeft = flushEdge(rectLeft, pointArr);
                    rectRight = flushEdge(rectRight, pointArr);
                }
                else {
                    if (j == 0 || !checkValidFloorTile(data[i]![j - 1]!)) {
                        if (!rectLeft) {
                            rectLeft = createRect(j, i, j, i + 1, 'left', offsets);
                        }
                        else {
                            rectLeft.endY = i + 1 + offsets.yOffset;
                        }
                    }
                    else {
                        rectLeft = flushEdge(rectLeft, pointArr);
                    }

                    if (j == data[0]!.length - 1 || !checkValidFloorTile(data[i]![j + 1]!)) {
                        if (!rectRight) {
                            rectRight = createRect(j + 1, i, j + 1, i + 1, 'right', offsets);
                        }
                        else {
                            rectRight.endY = i + 1 + offsets.yOffset;
                        }
                    }
                    else {
                        rectRight = flushEdge(rectRight, pointArr);
                    }
                }
            }
            rectLeft = flushEdge(rectLeft, pointArr);
            rectRight = flushEdge(rectRight, pointArr);
        }
        points.push(pointArr);
    });

    return points;
}

type Edge = {
    startX: number;
    startY: number;
    endX: number;
    endY: number;
    dir: string;
};

type Interval = { start: number; end: number };

// Removes each `remove` interval from `base`, splitting a base interval into
// two pieces if the removal falls in its middle, trimming it if at an end.
function subtractIntervals(base: Interval[], remove: Interval[]): Interval[] {
    let result = base.slice();
    remove.forEach(r => {
        const next: Interval[] = [];
        result.forEach(b => {
            if (r.end <= b.start || r.start >= b.end) {
                next.push(b);
                return;
            }
            if (b.start < r.start) next.push({ start: b.start, end: r.start });
            if (b.end > r.end) next.push({ start: r.end, end: b.end });
        });
        result = next;
    });
    return result;
}

// Reconstructs, for a single row of a layer, the x-intervals that are floor -
// by scanning that layer's own left/right edges. A 'left' edge marks where a
// floor run starts (scanning left to right) and 'right' marks where it ends,
// so sorted by x they alternate start/end pairs.
function rowFloorIntervals(edges: Edge[], row: number): Interval[] {
    const xs = edges
        .filter(e => (e.dir === 'left' || e.dir === 'right') && e.startY <= row && e.endY > row)
        .map(e => e.startX)
        .sort((a, b) => a - b);
    const intervals: Interval[] = [];
    for (let i = 0; i + 1 < xs.length; i += 2) {
        intervals.push({ start: xs[i]!, end: xs[i + 1]! });
    }
    return intervals;
}

// Same idea as rowFloorIntervals, but for a column, using the layer's own
// top/bot edges (which alternate start/end when sorted by y).
function colFloorIntervals(edges: Edge[], col: number): Interval[] {
    const ys = edges
        .filter(e => (e.dir === 'top' || e.dir === 'bot') && e.startX <= col && e.endX > col)
        .map(e => e.startY)
        .sort((a, b) => a - b);
    const intervals: Interval[] = [];
    for (let i = 0; i + 1 < ys.length; i += 2) {
        intervals.push({ start: ys[i]!, end: ys[i + 1]! });
    }
    return intervals;
}

/**
 * Combines two layers' edges into the boundary of their union. An edge from
 * one layer is only a real boundary if the *other* layer doesn't already have
 * floor on the non-floor side of it - otherwise the union has floor on both
 * sides and it's an interior seam, not a wall. This covers both layers
 * meeting exactly at a seam (e.g. a 'bot' edge lined up with a 'top' edge)
 * and one layer's floor overlapping into the other's interior (e.g. a bridge
 * whose ends sit on top of already-solid floor with no edge of its own
 * nearby) - the latter can't be detected by matching edges on the same line,
 * since the other layer may have no edge there at all.
 */
export function mergeEdges(edgesA: Edge[], edgesB: Edge[]): Edge[] {
    const result: Edge[] = [];

    const cancelHorizontal = (mine: Edge[], other: Edge[]) => {
        mine.filter(e => e.dir === 'top' || e.dir === 'bot').forEach(e => {
            // 'top' edge: floor is below the line (its own row), so it's only
            // real where the other layer lacks floor in the row above.
            // 'bot' edge: floor is above the line, real where the other layer
            // lacks floor in the row at the line.
            const otherRow = e.dir === 'top' ? e.startY - 1 : e.startY;
            const occupied = rowFloorIntervals(other, otherRow);
            subtractIntervals([{ start: e.startX, end: e.endX }], occupied).forEach(iv => {
                result.push({ startX: iv.start, endX: iv.end, startY: e.startY, endY: e.startY, dir: e.dir });
            });
        });
    };

    const cancelVertical = (mine: Edge[], other: Edge[]) => {
        mine.filter(e => e.dir === 'left' || e.dir === 'right').forEach(e => {
            // 'left' edge: floor is right of the line, real where the other
            // layer lacks floor in the column to the left.
            // 'right' edge: floor is left of the line, real where the other
            // layer lacks floor in the column at the line.
            const otherCol = e.dir === 'left' ? e.startX - 1 : e.startX;
            const occupied = colFloorIntervals(other, otherCol);
            subtractIntervals([{ start: e.startY, end: e.endY }], occupied).forEach(iv => {
                result.push({ startX: e.startX, endX: e.startX, startY: iv.start, endY: iv.end, dir: e.dir });
            });
        });
    };

    cancelHorizontal(edgesA, edgesB);
    cancelHorizontal(edgesB, edgesA);
    cancelVertical(edgesA, edgesB);
    cancelVertical(edgesB, edgesA);

    return result;
}

function flushEdge( edge: Edge | null, output: Edge[]): Edge | null {
    if (edge !== null) {
        output.push(edge);
    }
    return null;
}

function getOffset(tile: Phaser.Tilemaps.Tile) {
    let xOffset = 0;
    let yOffset = 0;
    if (tile.properties.xOffset) {
        xOffset = tile.properties.xOffset;
    }
    if (tile.properties.yOffset) {
        yOffset = tile.properties.yOffset;
    }

    return {xOffset: xOffset, yOffset: yOffset};
}

function createRect(startX: number, startY: number, endX: number, endY: number, dir: string,
    offset: {xOffset: number, yOffset: number}) {
    return {
        startX: startX + offset.xOffset,
        startY: startY + offset.yOffset,
        endX: endX + offset.xOffset,
        endY: endY + offset.yOffset,
        dir: dir,
    }
}

function checkValidFloorTile(tile: Phaser.Tilemaps.Tile) {
    return  Boolean(tile.properties.floor);
}
