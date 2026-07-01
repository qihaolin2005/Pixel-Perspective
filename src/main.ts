import Phaser from 'phaser';
import GameScene from './scenes/GameScene';

const config: Phaser.Types.Core.GameConfig = {
    type: Phaser.AUTO,
    pixelArt: true,
    roundPixels: true,
    width: 1536,
    height: 768,


    physics: {
        default: 'arcade',
        arcade: {
            fps: 60,
            debug: true,
            debugShowBody: true,
            debugShowStaticBody: true,
            debugShowVelocity: true,
            debugBodyColor: 0xff00ff, // Neon pink for dynamic bodies
            debugStaticBodyColor: 0x0000ff, // Blue for static bodies
            debugVelocityColor: 0x00ff00 // Green for velocity lines
        }
    },

    scene: [GameScene]

};
console.log('game start');
new Phaser.Game(config);