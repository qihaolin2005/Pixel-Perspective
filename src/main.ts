import Phaser from 'phaser';
import GameScene from './scenes/GameScene';

const config: Phaser.Types.Core.GameConfig = {
    type: Phaser.AUTO,
    pixelArt: true,
    roundPixels: true,
    width: 1536,
    height: 768,


    physics: {
        default: 'matter',
        matter: {
            gravity: { x: 0, y: 0 },
            debug: true
        }
    },

    scene: [GameScene]

};
console.log('game start');
new Phaser.Game(config);