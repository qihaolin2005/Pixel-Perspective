import Phaser, { Scene } from 'phaser';
import * as Transformations from "../utils/transformations";
import GameScene from '../scenes/GameScene';
import * as Contour from "./contour";

export default class IsoMap {
    private scene: GameScene;
    private map: Phaser.Tilemaps.Tilemap;
    private tilesets: Phaser.Tilemaps.Tileset[];
    public collisionLayers: Phaser.Tilemaps.TilemapLayer[];
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
            //const staticGroup = this.scene.physics.add.staticGroup();
            layer.forEachTile(tile => {
                if (tile.properties?.collides) {
                    console.log("collidable tile found");
                    //staticGroup.addCollidesWith(tile)
                }
            });
            


            layer.setCollisionByProperty({ collides: true });

            this.layers.push(layer);
        });
        this.points = [];
        //this.collisionLayers = this.makeCollisionLayer();

        //this.drawCollisionBoxes();

    }

    getSpawnPoint() {
        const spawnLayer = this.map.getObjectLayer('SpawnPoint');
        if (!spawnLayer) {
            throw new Error('Failed to get SpawnLayer');
        }
        const spawn = spawnLayer.objects.find(obj => obj.name === 'SpawnPoint');
        if (!spawn) {
            throw new Error('Failed to get SpawnPoint');
        }
        const spawnTiled = Transformations.TiledPixelsToCoords(spawn.x!, spawn.y!, this.map.tileWidth, this.map.tileHeight);
        const spawnWorldPixels = Transformations.isoCoordsToWorld(spawnTiled, this.xOffset);
        return spawnWorldPixels;

    }

    getFloorLayers() {
        return this.map.layers.filter(layer =>
            (layer.properties as any[])?.some(
                (p: any) => p.name === "floor" && p.value === true
            )
        );
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

                // edge vector
                const dx = endPoint.x - startPoint.x;
                const dy = endPoint.y - startPoint.y;

                const length = Math.sqrt(dx * dx + dy * dy);
                const angle = Math.atan2(dy, dx);

                // midpoint
                let centerX = (startPoint.x + endPoint.x) / 2;
                let centerY = (startPoint.y + endPoint.y) / 2;

                // perpendicular normal
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

                centerY -= this.tileHeight;

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

    drawCollisionBoxes() {
        const g = this.scene.add.graphics();
        g.lineStyle(2, 0xff0000);

        this.map.layers.forEach(layerData => {
            const layer = layerData.tilemapLayer;

            if (!layer) return;

            layer.forEachTile(tile => {
                const group = tile.getCollisionGroup?.();
                if (!group) return;

                for (const obj of group.objects) {
                    const worldX = layer.x + tile.pixelX + obj.x;
                    const worldY = layer.y + tile.pixelY + obj.y;

                    // RECTANGLE
                    if (obj.rectangle) {
                        g.strokeRect(worldX, worldY, obj.width, obj.height);
                    }

                    // POLYGON
                    if (obj.polygon) {
                        g.beginPath();

                        const points = obj.polygon;

                        g.moveTo(worldX + points[0].x, worldY + points[0].y);

                        for (let i = 1; i < points.length; i++) {
                            g.lineTo(worldX + points[i].x, worldY + points[i].y);
                        }

                        g.closePath();
                        g.strokePath();
                    }
                }
            }); 
        });
    }
}