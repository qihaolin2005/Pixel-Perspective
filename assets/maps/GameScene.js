import Phaser from 'phaser';

export default class GameScene extends Phaser.Scene {

    constructor() {
        super('GameScene');
    }

    preload() {
        this.load.tilemapTiledJSON('map', 'assets/maps/farm.tmj');
        this.load.image('free_ver', 'assets/images/Free_ver.png');
        this.load.image('objects', 'assets/images/Objects.png');
        this.load.spritesheet('player_idle', 'assets/sprites/MPlayer 1 idle.png', {
            frameWidth: 48,
            frameHeight: 48
        });
        this.load.spritesheet('player_walking', 'assets/sprites/MPlayer 1 walking.png', {
            frameWidth: 48,
            frameHeight: 48
        });
        
    }

    create() {
        const map = this.make.tilemap({
            key: 'map',
            tileWidth: 32,
            tileHeight: 16,
        });
        const xOffSet = Math.abs(map.width - map.height) * (map.tileWidth / 2);
        const yOffset = Math.abs(map.width - map.height) * (map.tileHeight / 2);

        
        const free_tile_set = map.addTilesetImage('Free ver', 'free_ver');
        const objects = map.addTilesetImage('Objects', 'objects');

        const tileset = [free_tile_set, objects];

        // Tile images are 32px tall but the isometric cell is 16px tall.
        // Tiled bottom-aligns tile images to the cell; Phaser top-aligns them.
        // Shift layers up by the difference so they match Tiled's layout.


        // const layerOffsetY = -(free_tile_set.tileHeight - map.tileHeight);

        map.layers.forEach(layer => {
            map.createLayer(layer.name, tileset, 496, -8);
        });

        const spawnLayer = map.getObjectLayer('SpawnPoint');
        const spawn = spawnLayer.objects.find(obj => obj.name === 'SpawnPoint');

        //const world = isoToWorld(spawn.x, spawn.y);

        this.player = this.physics.add.sprite(
            672,
            272,
            'player_idle'
        );

        //console.log('world: ', world.x, world.y);


        console.log('spawnpoint: ', spawn.x, spawn.y)

        const spawnTiled = TiledPixelsToCoords(spawn.x, spawn.y);
        const spawnWorldPixels = isoCoordsToWorld(spawnTiled.x, spawnTiled.y);

        this.add.rectangle(0, 0, 10, 10, 0xff0000);
        this.add.rectangle(0, 768, 10, 10, 0xff0000);
        this.add.rectangle(spawnWorldPixels.x, spawnWorldPixels.y, 10, 10, 0xff0000);

        this.cameras.main.setZoom(1);
        this.cameras.main.setBounds(0, 0, map.widthInPixels, map.heightInPixels);

        console.log('map width and height', map.width, map.height);

        
        /**
         * Transforms isometric coordinates to screen pixels
         * @param {*} x isometric coordinate
         * @param {*} y isometric coordinate
         * @returns x and y as on screen pixels
         */
        function isoCoordsToWorld(x, y) {
            return {
                x: (x - y) * (map.tileWidth / 2) + xOffSet,
                y: (x + y) * (map.tileHeight / 2) + yOffset,
            };
        }
        
        /**
         * Transforms the tiled pixels from tiled to tiled coordinates.
         * This results in isometric coordinates.
         * @param {*} x isometric pixel
         * @param {*} y isometric pixel
         * @returns x and y as isometric tiled coordinates
         */
        function TiledPixelsToCoords (x, y) {
            return {
                x : x / (map.tileWidth / 2),
                y : y / (map.tileHeight / 2),
            }
        }
        this.add.rectangle(spawn.x / 16, spawn.y / 8, 10, 10, 0xff0000);
    }
    
    

}

