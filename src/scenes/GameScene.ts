import Phaser from 'phaser';
import * as Transformations from "../utils/transformations";
import Player from '../player/Player';
import IsoMap from '../map/IsoMap';
import RenderLayers from '../map/RenderLayers';
import MovementController from '../controllers/MovementController.js';
import RevealManager from '../shaders/RevealManager';
import NPC from '../npc/NPC';
import TextBox, { type DialogueLine } from '../UI/TextBox';
import WebFontFile from '../utils/WebFontFile';
import { createPixelBitmapFont } from '../utils/PixelBitmapFont';
import SlimeNPC from '../npc/SlimeNPC';
import ComputerNPC from '../npc/ComputerNPC';


export default class GameScene extends Phaser.Scene {
    private reveal!: RevealManager;
    public player!: Player;
    private movementController!: MovementController;
    public interactables: Phaser.GameObjects.Sprite[];
    public enterKey!: Phaser.Input.Keyboard.Key;
    private isomap! : IsoMap;
    private mapMap!: Map<string, IsoMap>;
    public renderLayers!: RenderLayers;

    
    constructor() {
        super('GameScene');
        this.interactables = [];
    }

    preload() {
        this.load.tilemapTiledJSON('farm', 'assets/maps/farm.tmj');
        this.load.tilemapTiledJSON('room', 'assets/maps/room.tmj');
        this.load.spritesheet('Objects', 'assets/images/Objects.png', {
            frameWidth: 32,
            frameHeight: 32
        });
        this.load.spritesheet('House', 'assets/images/House.png', {
            frameWidth: 160,
            frameHeight: 160
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
        this.load.image('orig_big', 'assets/backgrounds/orig_big.png');
        this.load.image('orig_big_flipped', 'assets/backgrounds/orig_big_flipped.png');
        this.load.image('orange_background', 'assets/backgrounds/orange_background.png');
        this.load.image('textbox', 'assets/images/UI_TextBox.png');

        this.load.spritesheet('floor', 'assets/images/room/floor.png', {
            frameWidth: 80,
            frameHeight: 80
        });
        this.load.spritesheet('room_objects', 'assets/images/room/room_objects.png', {
            frameWidth: 80,
            frameHeight: 80
        });
        this.load.spritesheet('large_objects', 'assets/images/room/large_objects.png', {
            frameWidth: 160,
            frameHeight: 80
        });
        this.load.spritesheet('walls', 'assets/images/room/walls.png', {
            frameWidth: 80,
            frameHeight: 80
        });
        this.load.spritesheet('wall_decor', 'assets/images/room/wall_decor.png', {
            frameWidth: 80,
            frameHeight: 80
        });
        this.load.spritesheet('laptop', 'assets/sprites/laptop/laptop.png', {
            frameWidth: 29,
            frameHeight: 30
        });
        

        this.load.addFile(new WebFontFile(this.load, 'PixelFont', 'assets/fonts/monogram/ttf/monogram.ttf'));
        this.load.json('monogramPixelMask', 'assets/fonts/monogram/bitmap/monogram-bitmap.json');

        const loadSlime = (color: string) => {
        this.load.spritesheet(
                `slimes_${color}`,
                `assets/sprites/Slimes/slimes_${color}.png`,
                {
                    frameWidth: 46,
                    frameHeight: 33
                }
            );
        };
        loadSlime("pink");
        loadSlime("green");
        loadSlime("blue");
        loadSlime("white");
        loadSlime("yellow");


    }

    create() {
        this.renderLayers = new RenderLayers(this);
        this.collisionLogic()
        createPixelBitmapFont(this, 'monogramPixelMask');

        //const free_tile_set = {tilesetName: 'Free ver', imageName: 'free_ver'};
        //const tree_3x3 = {tilesetName: 'tree_3x3', imageName: 'tree_3x3'};
        
        const medium_trees = {tilesetName: 'medium_trees', imageName: 'medium_trees'};
        const Trees = {tilesetName: 'Trees', imageName: 'Trees'};
        const Terrain = {tilesetName: 'Terrain', imageName: 'Terrain'};
        const No_Top_Ground = {tilesetName: 'No_Top_Ground', imageName: 'No_Top_Ground'};
        const Wooden_Slabs = {tilesetName: 'Wooden Slabs', imageName: 'Wooden Slabs'};



        const objects = {tilesetName: 'Objects', imageName: 'Objects'};
        const tree_9x9 = {tilesetName: 'tree_9x9', imageName: 'tree_9x9'};
        const house = {tilesetName: 'House', imageName: 'House'};

        const farm_tileset = [objects, tree_9x9, medium_trees, Trees, Terrain, No_Top_Ground, Wooden_Slabs, house,];

        const floor = {tilesetName: 'floor', imageName: 'floor'};
        const room_objects = {tilesetName: 'room_objects', imageName: 'room_objects'};
        const large_objects = {tilesetName: 'large_objects', imageName: 'large_objects'};
        const walls = {tilesetName: 'walls', imageName: 'walls'};
        const wall_decor = {tilesetName: 'wall_decor', imageName: 'wall_decor'};

        const room_tileset = [floor, room_objects, large_objects, walls, wall_decor];


        this.enterKey = this.input.keyboard.addKey(
            Phaser.Input.Keyboard.KeyCodes.ENTER
        );
        const farmMap = new IsoMap(this, 'farm', farm_tileset);
        const roomMap = new IsoMap(this, 'room', room_tileset);

        this.mapMap = new Map<string, IsoMap>();
        this.mapMap.set('room', roomMap);
        this.mapMap.set('farm', farmMap);

        this.cameras.main.setZoom(3);
        this.player = new Player(this, 0, 0, 'player_idle');

        this.reveal = new RevealManager(this);
        this.reveal.setPlayer(this.player);
        farmMap.applyObjectLayerWithReveal(this.reveal);
        roomMap.applyObjectLayerWithReveal(this.reveal);



        const farmBG = new Phaser.GameObjects.Image(
            this,
            0,
            0,
            "orig_big"
        );
        farmMap.setbackground(farmBG);


        const roomBG = new Phaser.GameObjects.Image(
            this,
            0,
            0,
            "orange_background"
        );
        roomMap.setbackground(roomBG);

        farmMap.setVisible(false);
        roomMap.setVisible(false);

        this.launchMap('farm', "SpawnPoint", {});


        this.player.addToScene();

        this.cameras.main.startFollow(this.player, true);

        const blackSlimeDialogue = 
        ["Oh! A new visitor!", "Welcome to Pixel Perspective, or at least that's what everyone calls this place.", 
            "Anyways apparently this place was made to promote something called a software engineering resume? I don't really know...",
             "My name is Black Slime.",
             "What? Expecting something more original? I'll have you know it's a name passed down through generations and generations of warriors in battle.",
             "Just because my bodies made of jello and I live on a cutesy little farm doesn't mean that my ancestors weren't the most fearsome warriors in all of Pixel Perspective!",
             "Atleast, that's what my dad told me...",
            "Anyways, I'm not the only slime here, you can walk around and find some of the others, they might tell you some interesting facts about this world, since we haven't gotten a visitor in a while."];

        const pinkSlimeDialogue = ["Hey! A new Face! How did you come to find this place?", 
            "The Last visitor said they came from a cursed domain, described as a scorching expanse of brimstone and ash, where the ground itself smoldered under a sunless sky.",
            "They called it...",
            "LinkedIn!",
            "Oh you came wanting to know more about this land?",
            "Well I don't know much, but apparently this land was built on by a man named Typescript,",
            "A strange wizard who spent his days fighting bugs and arguing about types.",
            "He teamed up with a warrior named Phaser to bring the world to life,",
            "and a cartographer called Tiled to draw the lands we walk today."];

        const greenSlimeDialogue = ["shhhhh... quiet.", 
            "the flowers are speaking to me.", 
            "Here, take a listen. this red one is saying it needs more water", 
            "or was it the yellow one saying that?",
            "I'm Green Slime by the way, so what brings you to Pixel Perspective?",
            "You wanted to learn more about this place? Well apparently this place is called Pixel Perspective due everything being in a style called Pixel Art drawn in an Isometric Perspective.",
            "What's an isometric perspective? ",
            "Well... imagine looking at the world from a fancy angle where everything looks like a diamond.",
            "There's actually a ton of math involved too. Angles, coordinates, and transformations...",
            "But don't ask me how it works. I just water flowers.",
            "Anyway, enough about that. The flowers are telling me you should explore more.",
            "Or maybe they're telling me to water them...",
            "Actually, I should probably listen to them before they start complaining again."];


        const trashcan = 
       "   ____.-.____\n" +
       "  [___________]\n" +
       " (d|||||||||||b)\n" +
       " `|||  YOU  |||`\n" +
       "  |||||||||||||\n" +
       "  |||||||||||||\n" +
       "  |||||||||||||\n" +
       "   `\"\"\"\"\"\"\"\"\"`";

       const table_flip= 
       `(ノಠ益ಠ)ノ彡┻━┻    ٩(ˋᗣˊ*)و    ᕙ( ᗒᗣᗕ )ᕗ    (ง •̀_•́)ง`;

       const cry =  `.·°՞(っ-ᯅ-ς)՞°·.
       ｡°(°¯᷄◠¯᷅°)°｡
       (╥﹏╥)`;

        
        const blueSlimeDialogue = [
            "🤫👀🌳",
            "😳❗",
            "😱😱😱",
            "😡😡😡",
            "💢💢💢",
            "😤🌳",
            "🫵😑🤨❌🎮🚮",
            trashcan,
            table_flip,
            cry];

        const whiteSlimeDialogue = ["Ready or not here I come!", "Oh Hey! you're a new face. I'm White Slime.",
            "What was I doing? I was playing hide and seek with one of my friend. I love finding him because he gets so mad when I win.",
            "Oh that tree over there? Yeah, it's the biggest tree in all of Pixel Perspective, apparently Green Slime grew it himself.",
            "He even says that he can speak to the tree, but just between us, I think Green Slime's just got a few loose bolts up there...",
            "Oh a little fun fact about this bridge, apparently allowing someone to walk on it was a lot of work. The wizard of this place made it using something called an algorithm.",
            "Just a bunch of nerd magic stuff if you ask me.",
            "Oh I should get back to my hide and seek game, you should look for him as well, it's super funny to see him rage when he's found."
        ];

        const yellowSlimeDialogue = ["Hey I'm Bob!",
            "What? Did you expect me to have some generic name like \"Yellow Slime\" or whatever?",
            "Anyways, welcome to the edge of Pixel perspective!",
            "Legend has it, the wizard who created these edges using his most powerful spell, the contour algorithm",
            "See here at Pixel Perspective, you can't walk off the edge. Apparently every edge is surrounded by invisible rectangles, they stop someone from walking off using an ancient magic known as \"collision detection\".",
            "Here go give it a try, you can see that walking off the edge is impossible! 100% safe and sound!"
        ]

        const laptopDialogue = ["There's something interesting on this laptop..."]

        this.spawnSlime(farmMap, "Slime_Black", "black", "Black Slime", blackSlimeDialogue);
        this.spawnSlime(farmMap, "Slime_Pink", "pink", "Pink Slime", pinkSlimeDialogue);
        this.spawnSlime(farmMap, "Slime_Blue", "blue", "🔵", blueSlimeDialogue);
        this.spawnSlime(farmMap, "Slime_Green", "green", "Green Slime", greenSlimeDialogue);
        this.spawnSlime(farmMap, "Slime_White", "white", "White Slime", whiteSlimeDialogue);
        this.spawnSlime(farmMap, "Slime_Yellow", "yellow", "Bob", yellowSlimeDialogue);
        this.spawnLaptop(roomMap, "laptop", "laptop", laptopDialogue);
        this.movementController = new MovementController(this.isomap, this.player);

    }

    update(time: number, delta: number) {
        this.movementController.update(time, delta);
        this.isomap.updateDepthSorting(this.player);
        this.reveal.update();

    }

    spawnSlime(map: IsoMap, spawnName: string, color: string, name: string, dialogue: DialogueLine[]) {
        const spawn = map.getSpawnPoint(spawnName);
        const slime = new SlimeNPC(this, spawn.x, spawn.y, `slimes_${color}`, name, dialogue);
        this.interactables.push(slime);
        map.addNPC(slime);
        slime.play(`slimes_${color}-south`);
    }

    spawnLaptop(map: IsoMap, spawnName: string, name: string, dialogue: DialogueLine[]) {
        const spawn = map.getSpawnPoint(spawnName);
        const laptop = new ComputerNPC(this, spawn.x, spawn.y, `laptop`, name, dialogue);
        this.interactables.push(laptop);
        map.addNPC(laptop);
    }


    launchMap(mapName: string, spawnName: string, spawnNPC: {}) {
        const map = this.mapMap.get(mapName);
        if (map == null) {
            throw new Error(`${mapName} is not a map`);
        }
        if (this.isomap != null) {
            this.isomap.setVisible(false);
        }
        this.isomap = map;
        this.isomap.setVisible(true);
        const spawnPoint = this.isomap.getSpawnPoint(spawnName);
        this.player.setPosition(spawnPoint.x, spawnPoint.y);

    }

    collisionLogic() {
            this.matter.world.on("collisionstart",
                (event: MatterJS.IEventCollision<MatterJS.BodyType>) => {
                for (const pair of event.pairs) {
                    const bodyA = pair.bodyA as MatterJS.BodyType;
                    const bodyB = pair.bodyB as MatterJS.BodyType;

                    if (
                        (bodyA.label === "player" && bodyB.label === "transition") ||
                        (bodyB.label === "player" && bodyA.label === "transition")
                    ) {
                        const transition = bodyA.label == 'transition' ? bodyA.plugin : bodyB.plugin;
                        const map = transition.map;
                        const SpawnPoint = transition.SpawnPoint;
                        
                        this.launchMap(map, SpawnPoint, {});
                    }
                }
            }
        );
    }
    
    

}
