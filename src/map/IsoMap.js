import Phaser from 'phaser';
import * as Transformations from "../utils/transformations.js";

export default class IsoMap {
    constructor(scene, key, tilesets) {
        this.scene = scene;

        this.map = this.scene.make.tilemap({ 
            key: key
        });
        this.xOffSet = Transformations.calculateOffset(this.map.width, this.map.height, this.map.tileWidth);
        this.widthInPixels = this.map.widthInPixels;
        this.heightInPixels = this.map.heightInPixels;
        
        this.tilesets = tilesets.map(t =>
            this.map.addTilesetImage(t.tilesetName, t.imageName)
        );

        this.map.layers.forEach(layer => {
            this.map.createLayer(layer.name, this.tilesets, this.xOffSet, 0);
        });

        const floorLayers = this.map.layers.filter(layer =>
            layer.properties?.some(p => p.name === "floor" && p.value === true));

        console.log(floorLayers);


    }

    getSpawnPoint() {
        const spawnLayer = this.map.getObjectLayer('SpawnPoint');
        const spawn = spawnLayer.objects.find(obj => obj.name === 'SpawnPoint');
        const spawnTiled = Transformations.TiledPixelsToCoords(spawn.x, spawn.y, this.map.tileWidth, this.map.tileHeight);
        const spawnWorldPixels = Transformations.isoCoordsToWorld(spawnTiled, this.xOffSet);
        return spawnWorldPixels;
        
    }

}