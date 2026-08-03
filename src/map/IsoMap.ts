import Phaser, { Game, GameObjects, Scene } from 'phaser';
import * as Transformations from "../utils/transformations";
import GameScene from '../scenes/GameScene';
import * as Contour from "./contour";
import RevealManager from '../shaders/RevealManager';
import NPC from '../npc/NPC';

// Per-tile collision shapes from Tiled are defined in the tile's unflipped local
// space. Flipping the sprite mirrors the art within its existing bounding box
// without moving that box, so the collision vertices have to be mirrored the same
// way to stay aligned with what's drawn. Mirroring a single axis also reverses the
// polygon's winding order, which matters for Matter's concave decomposition -
// mirroring both axes (180° rotation) cancels back out, so only an odd number of
// flips needs the winding restored.
function mirrorCollisionVertices(
    verts: { x: number; y: number }[],
    flipH: boolean,
    flipV: boolean,
    tileWidth: number,
    tileHeight: number
): { x: number; y: number }[] {
    let result = verts;
    if (flipH) {
        result = result.map(v => ({ x: tileWidth - v.x, y: v.y }));
    }
    if (flipV) {
        result = result.map(v => ({ x: v.x, y: tileHeight - v.y }));
    }
    if (flipH !== flipV) {
        result = result.slice().reverse();
    }
    return result;
}

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
    // Objects whose footprint spans more than one iso row (e.g. the house) can't use a single
    // fixed depth - whether the player is in front of or behind them depends on the player's
    // world-x too. The map author traces the front boundary by hand in Tiled as a sequence of
    // `depth_point`-tagged point objects; connecting them in order gives a polyline whose y at
    // the player's current x is recomputed as the sprite's depth every frame.
    private depthSortedSprites: {
        sprite: Phaser.GameObjects.Image;
        segments: { x0: number; y0: number; x1: number; y1: number }[];
    }[]
    // Only sprites whose tile is tagged `occludable: true` in Tiled are registered with
    // RevealManager - most decor shouldn't ever fade out just because the player walks near it.
    private occludableSprites: Phaser.GameObjects.Image[]
    private npcList: NPC[];
    private background!: Phaser.GameObjects.Image;
    private walls: MatterJS.BodyType[];
    private collisionsList: MatterJS.BodyType[];
    private transitionsList: MatterJS.BodyType[];



    constructor(scene: GameScene, key: string, tilesets: { tilesetName: string; imageName: string }[]) {
        this.scene = scene;

        this.map = this.scene.make.tilemap({ 
            key: key
        });
        this.xOffset = Transformations.calculateOffset(this.map.height, this.map.tileWidth);
        console.log(this.map.width, this.map.height, this.map.tileWidth, this.map.tileHeight, this.map.widthInPixels, this.map.heightInPixels);
        this.layerOffsetX = this.xOffset - this.map.tileWidth / 2;
        this.layerOffsetY = -this.map.tileWidth/2;
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
            this.scene.renderLayers.floor.add(layer);

            this.layers.push(layer);
        });
        this.points = [];
        this.sprites = [];
        this.depthSortedSprites = [];
        this.occludableSprites = [];
        this.npcList = [];
        this.collisionsList = [];
        this.walls = [];
        this.transitionsList = [];

        this.addObjects();
        this.getTransitions();
        this.setFloorLayers();
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

    setbackground(source: Phaser.GameObjects.Image) {
        this.background = source;
        this.background.setOrigin(0, 0)
        this.background.x = 0;
        this.background.y = 0;
        this.scene.add.existing(this.background);
        // Math.max (cover), not Math.min (contain): scaling by the smaller ratio leaves
        // gaps on one axis. Uniform setScale keeps the source image undistorted, so the
        // larger axis overflows the map bounds instead - fine for a depth -10 backdrop.
        const scale = Math.max(
            this.widthInPixels / this.background.width,
            this.heightInPixels / this.background.height
        );

        this.background.setScale(scale);
        this.background.setDepth(-10);

    }

    addObjects(){
            // Decoration layers (no collision on any of their tiles - e.g. fruit sitting on a
            // tree) each get their own Layer, keyed by Tiled layer name, rendering above the
            // object layer. Layers with collidable tiles (house, fence, wall, trees) share the
            // object layer so their Y-interleaving with the player is untouched.
            this.map.getObjectLayerNames().forEach(layerName => {

                const layer = this.map.getObjectLayer(layerName);
                const objectsWithGid = layer!.objects.filter(obj => obj.gid != null);
                const isGround = objectsWithGid.length === 0 ||
                    objectsWithGid.some(obj => this.hasCollision(obj.gid!));
                const targetLayer = isGround
                    ? this.scene.renderLayers.object
                    : this.scene.renderLayers.getDecorationLayer(this.scene, layerName);

                layer!.objects.forEach(obj => {
                    if (obj.x == null || obj.y == null || obj.gid == null || obj.height == null) return;

                    const gid = obj.gid;
                    const flipH = obj.flippedHorizontal ?? false;
                    const flipV = obj.flippedVertical ?? false;
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

                    console.log("hello");
                    const tileProps = tileset.getTileProperties(gid) as
                        { depth_sorted?: boolean; occludable?: boolean } | undefined;
                    if (tileProps?.depth_sorted) {
                        this.depthSort(obj, tileset, sprite, flipH, flipV);
                    }
                    if (tileProps?.occludable) {
                        this.occludableSprites.push(sprite);
                    }


                    sprite.setFlipX(flipH);
                    sprite.setFlipY(flipV);
                    targetLayer.add(sprite);
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
                        // this shape's vertices, in the tile's local (unflipped) space
                        let localVerts: { x: number; y: number }[];

                        if (shape.polygon) {
                            localVerts = shape.polygon.map(p => ({
                                x: shape.x! + p.x,
                                y: shape.y! + p.y,
                            }));
                        } else if (shape.rectangle) {
                            const x0 = shape.x ?? 0;
                            const y0 = shape.y ?? 0;
                            const w = shape.width!, h = shape.height!;
                            localVerts = [
                                { x: x0,     y: y0     },
                                { x: x0 + w, y: y0     },
                                { x: x0 + w, y: y0 + h },
                                { x: x0,     y: y0 + h },
                            ];
                        } else {
                            continue; // ellipse / point — handle separately if you use them
                        }

                        localVerts = mirrorCollisionVertices(localVerts, flipH, flipV, tileset.tileWidth, tileset.tileHeight);

                        // shift into world space
                        const verts = localVerts.map(v => ({ x: tlx + v.x, y: tly + v.y }));

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

                        this.collisionsList.push(body);
                    }
                });
            
        });
    }

    setVisible(flag: boolean) {
        this.layers.forEach(layer => {
            layer.setVisible(flag);
        });
        this.sprites.forEach(sprite => {
            sprite.setVisible(flag);
        });
        this.npcList.forEach(npc => {
            npc.setVisible(flag);
        });
        this.walls.forEach(wall => {
            if (flag) {
                wall.collisionFilter.mask = 0xFFFFFFFF;
            }
            else {
                wall.collisionFilter.mask = 0;
            }
        })
        this.transitionsList.forEach(transition => {
            if (flag) {
                transition.collisionFilter.mask = 0xFFFFFFFF;
            }
            else {
                transition.collisionFilter.mask = 0;
            }
        })
        this.collisionsList.forEach(collision => {
            if (flag) {
                collision.collisionFilter.mask = 0xFFFFFFFF;
            }
            else {
                collision.collisionFilter.mask = 0;
            }
        })
        this.background.setVisible(flag);

    }

    addNPC(npc: NPC) {
        this.npcList.push(npc);
    }

    depthSort(
        obj: Phaser.Types.Tilemaps.TiledObject,
        tileset: Phaser.Tilemaps.Tileset,
        sprite: Phaser.GameObjects.Image,
        flipH: boolean,
        flipV: boolean
    ) {
        const collisionGroup = tileset.getTileCollisionGroup(obj.gid!);
        if (!collisionGroup) return;

        // Tiled stores custom properties as a [{name, value}, ...] array, not a plain
        // object - same shape used for the "floor" layer property elsewhere in this file.
        const tlx = sprite.x - sprite.originX * sprite.displayWidth;
        const tly = sprite.y - sprite.originY * sprite.displayHeight;

        const depthPoints = collisionGroup.objects
            .filter(shape => (shape.properties as any[] | undefined)?.some(p => p.name === 'depth_point'))
            .map(shape => {
                const order = (shape.properties as any[])
                    .find(p => p.name === 'depth_point').value as number;

                const [mirrored] = mirrorCollisionVertices(
                    [{ x: shape.x ?? 0, y: shape.y ?? 0 }],
                    flipH, flipV, tileset.tileWidth, tileset.tileHeight
                );

                return { order, x: tlx + mirrored!.x, y: tly + mirrored!.y };
            })
            .sort((a, b) => a.order - b.order);

        // A single point has nowhere to connect to - fall back to the sprite's static depth.
        if (depthPoints.length < 2) return;

        const segments = depthPoints.slice(1).map((p, i) => ({
            x0: depthPoints[i]!.x, y0: depthPoints[i]!.y,
            x1: p.x, y1: p.y,
        }));

        // Visual check: draw the resulting depth line directly over the sprite so it's
        // obvious in-game whether it actually traces the intended front boundary.
        if (this.scene.matter.world.drawDebug) {
            const lineGfx = this.scene.add.graphics();
            this.scene.renderLayers.debug.add(lineGfx);
            lineGfx.lineStyle(2, 0x00ff00, 1);
            for (const seg of segments) {
                lineGfx.lineBetween(seg.x0, seg.y0, seg.x1, seg.y1);
            }
            lineGfx.fillStyle(0x00ff00, 1);
            for (const p of depthPoints) {
                lineGfx.fillCircle(p.x, p.y, 2);
            }
        }

        this.depthSortedSprites.push({ sprite, segments });
    }

    // Called every frame - recomputes each depth-sorted sprite's depth as the y-value of its
    // segments at the player's current world-x, so the player correctly renders in front of or
    // behind different parts of the structure depending on where along it they're standing.
    updateDepthSorting(player: Phaser.Physics.Matter.Sprite) {
        for (const { sprite, segments } of this.depthSortedSprites) {
            const xs = segments.flatMap(s => [s.x0, s.x1]);
            const qx = Phaser.Math.Clamp(player.x, Math.min(...xs), Math.max(...xs));

            for (const seg of segments) {
                const lo = Math.min(seg.x0, seg.x1);
                const hi = Math.max(seg.x0, seg.x1);
                if (qx >= lo && qx <= hi) {
                    const t = hi === lo ? 0 : (qx - seg.x0) / (seg.x1 - seg.x0);
                    sprite.setDepth(seg.y0 + t * (seg.y1 - seg.y0));
                    break;
                }
            }
        }
    }

    getFloorLayers() {
        return this.map.layers.filter(layer =>
            (layer.properties as any[])?.some(
                (p: any) => p.name === "floor" && p.value === true
            )
        );
    }

    getTransitions() {
        const transitionLayer = this.map.getObjectLayer('transition');
        if (transitionLayer != null) {
            for (const obj of transitionLayer.objects) {
                const verts = Transformations.isoRectVertices(
                    obj.x!, obj.y!, obj.width!, obj.height!,
                    this.tileWidth, this.tileHeight, this.xOffset
                );
                const { x: cx, y: cy } = polygonCentroid(verts);
                const properties = Object.fromEntries(
                    (obj.properties ?? []).map(p => [p.name, p.value])
                );

                const transition = this.scene.matter.add.fromVertices(cx, cy, verts, {
                    isStatic: true,
                    isSensor: true,
                    label: "transition",
                });
                transition.plugin = properties;

                this.transitionsList.push(transition);
            }
        }

    }
    
    

    private hasCollision(gid: number): boolean {
        const tileset = this.map.tilesets.find(ts => gid >= ts.firstgid && gid < ts.firstgid + ts.total);
        const group = tileset?.getTileCollisionGroup(gid) as { objects: unknown[] } | undefined;
        return !!group && group.objects.length > 0;
    }

    applyObjectLayerWithReveal(reveal: RevealManager) {
            this.occludableSprites.forEach(sprite => {
                reveal.register(sprite);
            });
    }

    setFloorLayers() {
        const floor = this.getFloorLayers();

        // const test = [];
        // const mergeFloor = Contour.CreateTransitionLayer(floor[1]!, floor[0]!);
        // test.push(mergeFloor);
        let floorPoints = Contour.generateEdges(floor);
        const points = [];
        if (floorPoints.length > 1) {
            let combine = Contour.mergeEdges(floorPoints[0]!, floorPoints[1]!);
            points.push(combine);

        }
        else {
            points.push(floorPoints[0]!);
        }

        console.log('points', points);

        points.forEach(pointArray => {
            pointArray.forEach(point => {

                let startPoint = Transformations.isoCoordsToWorld(
                    {
                        x: point.startX,
                        y: point.startY,
                        tileWidth: this.tileWidth,
                        tileHeight: this.tileHeight
                    },
                    this.xOffset
                );

                let endPoint = Transformations.isoCoordsToWorld(
                    {
                        x: point.endX,
                        y: point.endY,
                        tileWidth: this.tileWidth,
                        tileHeight: this.tileHeight
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

                const wall = this.scene.matter.add.rectangle(
                    centerX,
                    centerY,
                    length,
                    2,
                    {
                        isStatic: true,
                        angle
                    }
                );
                this.walls.push(wall);
            });
        });
    }


    createCollisionBodies() {
        this.layers.forEach(layer => {
            this.scene.matter.world.convertTilemapLayer(layer);
        });
    }
}