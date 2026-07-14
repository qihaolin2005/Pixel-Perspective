import Phaser, { GameObjects, Scene } from 'phaser';
import * as Transformations from "../utils/transformations";
import GameScene from '../scenes/GameScene';
import * as Contour from "./contour";
import RevealManager from '../shaders/RevealManager';

// Matches Matter.js's Vertices.centre: the area-weighted polygon centroid, not the
// simple average of vertices. Bodies.fromVertices repositions bodies to whatever
// centroid you tell it, using this same formula internally - passing a plain vertex
// mean here would make asymmetric polygons drift from where their vertices actually are.
function polygonCentroid(verts: { x: number; y: number }[]): { x: number; y: number } {
    let area = 0, cx = 0, cy = 0;
    for (let i = 0; i < verts.length; i++) {
        const a = verts[i]!;
        const b = verts[(i + 1) % verts.length]!;
        const cross = a.x * b.y - b.x * a.y;
        area += cross;
        cx += (a.x + b.x) * cross;
        cy += (a.y + b.y) * cross;
    }
    area *= 0.5;
    if (Math.abs(area) < 1e-9) {
        const mean = verts.reduce((s, v) => ({ x: s.x + v.x, y: s.y + v.y }), { x: 0, y: 0 });
        return { x: mean.x / verts.length, y: mean.y / verts.length };
    }
    return { x: cx / (6 * area), y: cy / (6 * area) };
}

export default class IsoMap {
    private scene: GameScene;
    private map: Phaser.Tilemaps.Tilemap;
    private tilesets: Phaser.Tilemaps.Tileset[];
    public layers: Phaser.Tilemaps.TilemapLayer[];
    public xOffset: integer;
    // Layers render at (xOffset - 16, -16) - see constructor. Anything projecting
    // world positions for this map (floor collision, spawn point, etc.) must use
    // the same offset or it'll drift from where tiles actually render.
    public layerOffsetX: integer;
    public layerOffsetY: integer;
    public widthInPixels: integer;
    public heightInPixels: integer;
    public tileWidth: integer;
    public tileHeight: integer;
    public points: {x: number, y: number}[][];
    private sprites: Phaser.GameObjects.Image[]



    constructor(scene: GameScene, key: string, tilesets: { tilesetName: string; imageName: string }[]) {
        this.scene = scene;

        this.map = this.scene.make.tilemap({ 
            key: key
        });
        this.xOffset = Transformations.calculateOffset(this.map.width, this.map.height, this.map.tileWidth);
        this.layerOffsetX = this.xOffset - 16;
        this.layerOffsetY = -16;
        this.widthInPixels = this.map.widthInPixels;
        this.heightInPixels = this.map.heightInPixels;
        this.tileWidth = this.map.tileWidth;
        this.tileHeight = this.map.tileHeight;
        
        this.tilesets = tilesets.map(t => {
            const tileset = this.map.addTilesetImage(t.tilesetName, t.imageName);
            if (!tileset) {
                throw new Error(
                    `Failed to load tileset: tilesetName="${t.tilesetName}", imageName="${t.imageName}"`
                );
            }
            return tileset;
        });
        
        this.layers = [];

        this.map.layers.forEach(layerData => {
            const layer = this.map.createLayer(
                layerData.name,
                this.tilesets,
                this.layerOffsetX,
                this.layerOffsetY
            )as Phaser.Tilemaps.TilemapLayer;

            if (!layer) return;
            layer.forEachTile(tile => {
                if (tile.properties?.collides) {
                    console.log("collidable tile found");
                }
            });
            


            layer.setCollisionByProperty({ collides: true });

            this.layers.push(layer);
        });
        this.points = [];
        this.sprites = [];
        this.addObjects();
    }

    getSpawnPoint(spawnName: String) {
        const spawnLayer = this.map.getObjectLayer('SpawnPoint');
        if (!spawnLayer) {
            throw new Error('Failed to get SpawnLayer');
        }
        const spawn = spawnLayer.objects.find(obj => obj.name === spawnName);
        if (!spawn) {
            throw new Error('Failed to get SpawnPoint');
        }
        const spawnTiled = Transformations.TiledPixelsToCoords(spawn.x!, spawn.y!, this.map.tileWidth, this.map.tileHeight);
        const spawnWorldPixels = Transformations.isoCoordsToWorld(spawnTiled, this.xOffset);
        return spawnWorldPixels;

    }

    addObjects(){
            this.map.getObjectLayerNames().forEach(layerName => {

                const layer = this.map.getObjectLayer(layerName);
                const debug = this.scene.add.graphics({ lineStyle: { width: 1, color: 0xff0000 } });
                debug.setDepth(999999);

                layer!.objects.forEach(obj => {
                    if (obj.x == null || obj.y == null || obj.gid == null || obj.height == null) return;

                    const gid = obj.gid;
                    const tileset = this.map.tilesets.find(ts =>
                        gid >= ts.firstgid && gid < ts.firstgid + ts.total
                    )!;
                    const frame = gid - tileset.firstgid;

                    const isoCoords = Transformations.TiledPixelsToCoords(obj.x, obj.y, this.tileWidth, this.tileHeight);
                    const worldXY = Transformations.isoCoordsToWorld(isoCoords, this.xOffset);

                    const sprite = this.scene.add.image(
                        worldXY.x,
                        worldXY.y - (obj.height / 2),
                        tileset.image!.key,
                        frame
                    );
                    sprite.setDepth(worldXY.y);
                    this.sprites.push(sprite);

                    // --- draw the tile's collision shapes over the sprite ---
                    // NOTE: pass the GLOBAL gid here, not `frame`. getTileCollisionGroup
                    // subtracts firstgid internally (same value the docs pass as tile.index).
                    const group = tileset.getTileCollisionGroup(gid);
                    if (!group || group.objects.length === 0) return;

                    const tlx = sprite.x - sprite.originX * sprite.displayWidth;
                    const tly = sprite.y - sprite.originY * sprite.displayHeight;

                    for (const shape of group.objects) {
                        // this shape's vertices, in world space
                        let verts: { x: number; y: number }[];

                        if (shape.polygon) {
                            verts = shape.polygon.map(p => ({
                                x: tlx + shape.x! + p.x,
                                y: tly + shape.y! + p.y,
                            }));
                        } else if (shape.rectangle) {
                            const x0 = tlx + (shape.x ?? 0);
                            const y0 = tly + (shape.y ?? 0);
                            const w = shape.width!, h = shape.height!;
                            verts = [
                                { x: x0,     y: y0     },
                                { x: x0 + w, y: y0     },
                                { x: x0 + w, y: y0 + h },
                                { x: x0,     y: y0 + h },
                            ];
                        } else {
                            continue; // ellipse / point — handle separately if you use them
                        }

                        // fromVertices centers the body's centroid on (x, y). Matter computes that
                        // centroid internally using the polygon area formula (Vertices.centre), not
                        // a simple vertex average - passing the wrong kind of centroid here makes
                        // Matter shift the whole shape by the difference, which only shows up for
                        // asymmetric polygons (rectangles' mean == area centroid, so they look fine).
                        const { x: cx, y: cy } = polygonCentroid(verts);

                        const body = this.scene.matter.add.fromVertices(cx, cy, verts, { isStatic: true });

                        // Concave shapes get decomposed into convex parts (via poly-decomp), and for
                        // static bodies Matter averages each part's centroid *unweighted* by area
                        // (Body._totalProperties treats static parts as mass 1 regardless of size),
                        // which drifts from the true polygon centroid whenever the parts are unequal
                        // in size - shifting the whole shape off the art. Snapping the body's actual
                        // bounds back onto the vertices we intended is a pure translation, so it
                        // realigns the shape regardless of how Matter centered it internally.
                        const dx = Math.min(...verts.map(v => v.x)) - body.bounds.min.x;
                        const dy = Math.min(...verts.map(v => v.y)) - body.bounds.min.y;
                        if (dx !== 0 || dy !== 0) {
                            this.scene.matter.body.translate(body, { x: dx, y: dy });
                        }
                    }
                });
            
        });
    }

    getFloorLayers() {
        return this.map.layers.filter(layer =>
            (layer.properties as any[])?.some(
                (p: any) => p.name === "floor" && p.value === true
            )
        );
    }

    applyObjectLayerWithReveal(reveal: RevealManager) {
            const isOccluder = true;

            this.sprites.forEach(sprite => {
                if (isOccluder) {
                    reveal.register(sprite);
                }  
            });
    }

    setFloorLayers() {
        const floor = this.getFloorLayers();
        const points = Contour.generateEdges(floor);
        console.log(points);

        points.forEach(pointArray => {
            pointArray.forEach(point => {

                let startPoint = Transformations.isoCoordsToWorld(
                    {
                        x: point.startX,
                        y: point.startY,
                        tileWidth: 32,
                        tileHeight: 16
                    },
                    this.xOffset
                );

                let endPoint = Transformations.isoCoordsToWorld(
                    {
                        x: point.endX,
                        y: point.endY,
                        tileWidth: 32,
                        tileHeight: 16
                    },
                    this.xOffset
                );

                const dx = endPoint.x - startPoint.x;
                const dy = endPoint.y - startPoint.y;

                const length = Math.sqrt(dx * dx + dy * dy);
                const angle = Math.atan2(dy, dx);

                let centerX = (startPoint.x + endPoint.x) / 2;
                let centerY = (startPoint.y + endPoint.y) / 2;

                const nx = -Math.sin(angle);
                const ny = Math.cos(angle);

                const offset = 2;

                if (point.dir === "top") {
                    centerX += nx * offset;
                    centerY += ny * offset;
                }

                if (point.dir === "bottom") {
                    centerX -= nx * offset;
                    centerY -= ny * offset;
                }

                if (point.dir === "left") {
                    centerX += nx * offset;
                    centerY += ny * offset;
                }

                if (point.dir === "right") {
                    centerX -= nx * offset;
                    centerY -= ny * offset;
                }


                let sign = 1;

                switch (point.dir) {
                    case "top":
                    case "left":
                        sign = -1;
                        break;

                    case "bottom":
                    case "right":
                        sign = 1;
                        break;
                }

                centerX += nx * offset * sign;
                centerY += ny * offset * sign;

                //centerY -= this.tileHeight;

                this.scene.matter.add.rectangle(
                    centerX,
                    centerY,
                    length,
                    2,
                    {
                        isStatic: true,
                        angle
                    }
                );
            });
        });
    }


    createCollisionBodies() {
        this.layers.forEach(layer => {
            this.scene.matter.world.convertTilemapLayer(layer);
        });
    }
}