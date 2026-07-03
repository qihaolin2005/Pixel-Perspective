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
                const currTile = data[i]![j];
                if (currTile!.index == -1) {
                    rectTop = flushEdge(rectTop, pointArr);
                    rectBot = flushEdge(rectBot, pointArr);
                }
                else {
                    if (i == 0 || data[i - 1]![j]?.index == -1) {
                        if (!rectTop) {
                            rectTop = {startX : j, startY: i, endX: j + 1, endY: i, dir: 'top'};
                        }
                        else {
                            rectTop.endX = j + 1;
                        }
                    }

                    if (i == data.length - 1 || data[i + 1]![j]?.index == -1) {
                        if (!rectBot) {
                            rectBot = {startX : j, startY: i + 1, endX: j + 1, endY: i + 1, dir: 'bot'};
                        }
                        else {
                            rectBot.endX = j + 1;
                        }
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
                const currTile = data[i]![j];
                if (currTile!.index == -1) {
                    rectLeft = flushEdge(rectLeft, pointArr);
                    rectRight = flushEdge(rectRight, pointArr);
                }
                else {
                    if (j == 0 || data[i]![j - 1]?.index == -1) {
                        if (!rectLeft) {
                            rectLeft = {
                                startX: j,
                                startY: i,
                                endX: j,
                                endY: i + 1,
                                dir: 'left'
                            };
                        }
                        else {
                            rectLeft.endY = i + 1;
                        }
                    }

                    if (j == data[0]!.length - 1 || data[i]![j + 1]?.index == -1) {
                        if (!rectRight) {
                            rectRight = {
                                startX: j + 1,
                                startY: i,
                                endX: j + 1,
                                endY: i + 1,
                                dir: 'right'
                            };
                        }
                        else {
                            rectRight.endY = i + 1;
                        }
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
