import Phaser from 'phaser';
import * as Transformations from "../utils/transformations";
import Player from '../player/Player';
import IsoMap from '../map/IsoMap';
import MovementController from '../controllers/MovementController.js';


export default class GameScene extends Phaser.Scene {
    private player!: Player;
    private movementController!: MovementController;
    
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
        console.log(this.physics.getConfig());


        this.physics.world.TILE_BIAS = 64;
        const free_tile_set = {tilesetName: 'Free ver', imageName: 'free_ver'};
        const objects = {tilesetName: 'Objects', imageName: 'objects'};

        const tileset = [free_tile_set, objects];

        const isomap = new IsoMap(this, 'map', tileset);
        const spawnWorldPixels = isomap.getSpawnPoint();
        console.log(spawnWorldPixels);

        this.player = new Player(this, spawnWorldPixels.x, spawnWorldPixels.y, 'player_idle');
        this.player.addToScene();

        this.cameras.main.setZoom(1);
        this.cameras.main.setBounds(0, 0, isomap.widthInPixels, isomap.heightInPixels);

        console.log(isomap.getFloorLayers());
        this.movementController = new MovementController(isomap, this.player);

        
        const collisionBodies = isomap.createCollisionBodies();
        this.physics.add.collider(this.player, collisionBodies);

        // isomap.layers.forEach(layer => {
        //     layer.renderDebug(this.add.graphics(), {
        //         tileColor: null,
        //         collidingTileColor: new Phaser.Display.Color(255, 0, 0, 120),
        //     });
        // });

        this.physics.world.createDebugGraphic();
           
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
  
        let test = Transformations.isoCoordsToWorld({x: 12, y: 15, tileWidth: 32, tileHeight: 16}, 512);
        console.log(test.x, test.y);
        this.add.rectangle(test.x, test.y, 3, 3, 0xff0000).setDepth(9999);


    }

    update(time: number, delta: number) {
        this.movementController.update(time, delta);

    }
    
    

}

