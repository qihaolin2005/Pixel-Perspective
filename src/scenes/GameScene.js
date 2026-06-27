import Phaser from 'phaser';
import * as Transformations from "../utils/transformations.js";
import * as Player from "../utils/playerController.js"

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
        });
        const xOffSet = Transformations.calculateOffset(map.width, map.height, map.tileWidth);

        
        const free_tile_set = map.addTilesetImage('Free ver', 'free_ver');
        const objects = map.addTilesetImage('Objects', 'objects');

        const tileset = [free_tile_set, objects];


        map.layers.forEach(layer => {
            map.createLayer(layer.name, tileset, xOffSet, 0);
        });

        const spawnLayer = map.getObjectLayer('SpawnPoint');
        const spawn = spawnLayer.objects.find(obj => obj.name === 'SpawnPoint');
        const spawnTiled = Transformations.TiledPixelsToCoords(spawn.x, spawn.y, map.tileWidth, map.tileHeight);
        const spawnWorldPixels = Transformations.isoCoordsToWorld(spawnTiled, xOffSet);


        // this.player = this.physics.add.sprite(
        //     spawnWorldPixels.x,
        //     spawnWorldPixels.y,
        //     'player_idle'
        // );
        this.player = new Player.Player(this, spawnWorldPixels.x, spawnWorldPixels.y, 'player_idle');
        this.player.addToScene();

        this.cameras.main.setZoom(1);
        this.cameras.main.setBounds(0, 0, map.widthInPixels, map.heightInPixels);

        console.log('map width and height', map.width, map.height);
    }

    update() {
        this.player.update();
    }
    
    

}

