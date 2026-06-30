import Phaser, { Scene } from 'phaser';
import * as Transformations from "../utils/transformations";
import GameScene from '../scenes/GameScene';

export default class IsoMap {
    private scene: GameScene;
    private map: Phaser.Tilemaps.Tilemap;
    private tilesets: Phaser.Tilemaps.Tileset[];

    public xOffset: integer;
    public widthInPixels: integer;
    public heightInPixels: integer;
    public tileWidth: integer;
    public tileHeight: integer;



    constructor(scene: GameScene, key: string, tilesets: { tilesetName: string; imageName: string }[]) {
        this.scene = scene;

        this.map = this.scene.make.tilemap({ 
            key: key
        });
        this.xOffset = Transformations.calculateOffset(this.map.width, this.map.height, this.map.tileWidth);
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
        
        // -16s are for offsetting the layer, for some odd reason it needs to be offset idrk
        this.map.layers.forEach(layerData => {this.map.createLayer(
                layerData.name,
                this.tilesets,
                this.xOffset - 16,
                -16,
            );
        });

        this.drawCollisionBoxes();

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