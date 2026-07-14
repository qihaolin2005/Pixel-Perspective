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
                            // rectLeft = {
                            //     startX: j,
                            //     startY: i,
                            //     endX: j,
                            //     endY: i + 1,
                            //     dir: 'left'
                            // };
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
                            // rectRight = {
                            //     startX: j + 1,
                            //     startY: i,
                            //     endX: j + 1,
                            //     endY: i + 1,
                            //     dir: 'right'
                            // };
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
