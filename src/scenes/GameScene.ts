import Phaser from 'phaser';
import * as Transformations from "../utils/transformations";
import Player from '../player/Player';
import IsoMap from '../map/IsoMap';
import MovementController from '../controllers/MovementController.js';
import RevealManager from '../shaders/RevealManager';
import NPC from '../npc/NPC';
import TextBox from '../UI/TextBox';
import WebFontFile from '../utils/WebFontFile';


export default class GameScene extends Phaser.Scene {
    private reveal!: RevealManager;
    public player!: Player;
    private movementController!: MovementController;
    public interactables: Phaser.GameObjects.Sprite[];
    public enterKey: Phaser.Input.Keyboard.Key;

    
    constructor() {
        super('GameScene');
        this.interactables = [];
    }

    preload() {
        this.load.tilemapTiledJSON('map', 'assets/maps/farm.tmj');
        this.load.spritesheet('Objects', 'assets/images/Objects.png', {
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
        this.load.spritesheet('medium_trees', 'assets/images/medium_trees.png', {
                    frameWidth: 64,
                    frameHeight: 96
        }); 
        this.load.spritesheet('Trees', 'assets/images/Trees.png', {
                    frameWidth: 32,
                    frameHeight: 32
        }); 
        this.load.spritesheet('Terrain', 'assets/images/Terrain.png', {
                    frameWidth: 32,
                    frameHeight: 32
        }); 
        this.load.spritesheet('No_Top_Ground', 'assets/images/No_Top_Ground.png', {
                    frameWidth: 32,
                    frameHeight: 32
        });  
        this.load.spritesheet('Wooden Slabs', 'assets/images/Wooden Slabs.png', {
                    frameWidth: 32,
                    frameHeight: 32
        });
        this.load.spritesheet('slimes_black', 'assets/sprites/Slimes/slimes_dark.png', {
            frameWidth: 46,
            frameHeight: 33
        });
        this.load.spritesheet('enter', 'assets/keys/ENTER.png', {
            frameWidth: 39,
            frameHeight: 36
        });
        this.load.image('textbox', 'assets/images/UI_TextBox.png');

        this.load.addFile(new WebFontFile(this.load, 'PixelFont', 'assets/fonts/monogram/ttf/monogram.ttf'));
    }

    create() {
        //const free_tile_set = {tilesetName: 'Free ver', imageName: 'free_ver'};
        //const tree_3x3 = {tilesetName: 'tree_3x3', imageName: 'tree_3x3'};
        const medium_trees = {tilesetName: 'medium_trees', imageName: 'medium_trees'};
        const Trees = {tilesetName: 'Trees', imageName: 'Trees'};
        const Terrain = {tilesetName: 'Terrain', imageName: 'Terrain'};
        const No_Top_Ground = {tilesetName: 'No_Top_Ground', imageName: 'No_Top_Ground'};
        const Wooden_Slabs = {tilesetName: 'Wooden Slabs', imageName: 'Wooden Slabs'};



        const objects = {tilesetName: 'Objects', imageName: 'Objects'};
        const tree_9x9 = {tilesetName: 'tree_9x9', imageName: 'tree_9x9'};

        const tileset = [objects, tree_9x9, medium_trees, Trees, Terrain, No_Top_Ground, Wooden_Slabs];

        const isomap = new IsoMap(this, 'map', tileset);
        const spawnWorldPixels = isomap.getSpawnPoint("SpawnPoint");
        const slimeBlackSpawn = isomap.getSpawnPoint("Slime_Black");
        console.log(
            this.scale.width,
            this.scale.height,
            this.cameras.main.displayWidth,
            this.cameras.main.displayHeight
        );
        this.cameras.main.setZoom(1);

        this.enterKey = this.input.keyboard.addKey(
            Phaser.Input.Keyboard.KeyCodes.ENTER
        );
   


        this.player = new Player(this, spawnWorldPixels.x, spawnWorldPixels.y, 'player_idle');
        this.player.addToScene();
        this.cameras.main.startFollow(this.player, false);

        const slimeBlack = new NPC(this, slimeBlackSpawn.x, slimeBlackSpawn.y, "slimes_black", "Black Slime", ["hi", "My Name is Slime"]);
        this.interactables.push(slimeBlack);
        slimeBlack.play('slimes_black-south');

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

        isomap.setFloorLayers();

    }

    update(time: number, delta: number) {
        this.movementController.update(time, delta);
        this.reveal.update();

    }
    
    

}

