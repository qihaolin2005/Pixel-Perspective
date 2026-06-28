import Phaser from 'phaser';
import * as Transformations from "../utils/transformations.js";
import * as Player from "../player/playerController.js"
import IsoMap from '../map/IsoMap.js';

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
        // const map = this.make.tilemap({
        //     key: 'map',
        // });
        // const xOffSet = Transformations.calculateOffset(map.width, map.height, map.tileWidth);

        
        

        // map.layers.forEach(layer => {
        //     map.createLayer(layer.name, tileset, xOffSet, 0);
        // });

        const free_tile_set = {tilesetName: 'Free ver', imageName: 'free_ver'};
        const objects = {tilesetName: 'Objects', imageName: 'objects'};

        const tileset = [free_tile_set, objects];

        const isomap = new IsoMap(this, 'map', tileset);
        const spawnWorldPixels = isomap.getSpawnPoint();
        console.log(spawnWorldPixels);

        this.player = new Player.Player(this, spawnWorldPixels.x, spawnWorldPixels.y, 'player_idle');
        this.player.addToScene();

        this.cameras.main.setZoom(1);
        this.cameras.main.setBounds(0, 0, isomap.widthInPixels, isomap.heightInPixels);

    }

    update() {
        this.player.update();
    }
    
    

}

