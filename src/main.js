import Phaser from 'phaser';
import GameScene from './scenes/GameScene.js';

const config = {
    type: Phaser.AUTO,
    pixelArt: true,
    roundPixels: true,
    width: 1536,
    height: 768,


    physics: {
        default: 'arcade'
    },

    scene: [GameScene]

};
console.log('game start');
new Phaser.Game(config);