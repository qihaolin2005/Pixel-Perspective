import Phaser from 'phaser';
import * as Transformations from "../utils/transformations";
import Player from '../player/Player';
import IsoMap from '../map/IsoMap';
import MovementController from '../controllers/MovementController.js';
import RevealManager from '../shaders/RevealManager';


export default class GameScene extends Phaser.Scene {
    private reveal!: RevealManager;
    private player!: Player;
    private movementController!: MovementController;
    
    constructor() {
        super('GameScene');
    }

    preload() {
        this.load.tilemapTiledJSON('map', 'assets/maps/farm.tmj');
        this.load.image('free_ver', 'assets/images/Free_ver.png');
        this.load.spritesheet('objects', 'assets/images/Objects.png', {
            frameWidth: 32,
            frameHeight: 32
        });
        
        this.load.spritesheet('player_idle', 'assets/sprites/MPlayer 1 idle.png', {
            frameWidth: 48,
            frameHeight: 48
        });
        this.load.spritesheet('player_walking', 'assets/sprites/MPlayer 1 walking.png', {
            frameWidth: 48,
            frameHeight: 48
        });
        this.load.spritesheet('tree_9x9', 'assets/images/tree_9x9.png', {
                    frameWidth: 288,
                    frameHeight: 144
        });        
        
    }

    create() {
        const free_tile_set = {tilesetName: 'Free ver', imageName: 'free_ver'};
        const objects = {tilesetName: 'Objects', imageName: 'objects'};
        const tree_9x9 = {tilesetName: 'tree_9x9', imageName: 'tree_9x9'};

        const tileset = [free_tile_set, objects, tree_9x9];

        const isomap = new IsoMap(this, 'map', tileset);
        const spawnWorldPixels = isomap.getSpawnPoint();
        console.log(spawnWorldPixels);

        this.player = new Player(this, spawnWorldPixels.x, spawnWorldPixels.y, 'player_idle');
        this.player.addToScene();

        this.cameras.main.setZoom(1);
        this.cameras.main.setBounds(0, 0, isomap.widthInPixels, isomap.heightInPixels);

        console.log(isomap.getFloorLayers());
        this.movementController = new MovementController(isomap, this.player);

        
        //isomap.createCollisionBodies();

        this.reveal = new RevealManager(this);
        this.reveal.setPlayer(this.player);
        isomap.applyObjectLayerWithReveal(this.reveal);

        const corners = [
            { x: 0, y: 0 },
            { x: 64, y: 0 },
            { x: 0, y: 32 },
            { x: 64, y: 32 },
            { x: 22, y: 12 },
        ];

        for (const c of corners) {
            const p = Transformations.isoCoordsToWorld({
                x: c.x,
                y: c.y,
                tileWidth: 32,
                tileHeight: 16,
            }, isomap.xOffset);

            this.add.circle(p.x, p.y, 5, 0xff0000);
            this.add.text(p.x + 5, p.y, `${c.x},${c.y}`);
        }

        //isomap.setFloorLayers();

    }

    update(time: number, delta: number) {
        this.movementController.update(time, delta);
        this.reveal.update();

    }
    
    

}

