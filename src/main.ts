import Phaser from 'phaser';
import GameScene from './scenes/GameScene';

const config: Phaser.Types.Core.GameConfig = {
    type: Phaser.AUTO,
    pixelArt: true,
    roundPixels: true,

    // A followed camera scrolls to `player - width / 2`, and the render matrix undoes that
    // by translating back by the same half-size, so every tile lands on screen at
    // `zoom * (worldX - player.x) + width / 2`. An odd canvas size makes that trailing term
    // a half pixel, which biases the whole world off-grid no matter how clean the world
    // coordinates are - so keep both dimensions even.
    // FIT would stretch that even canvas back over the odd window by a fractional factor,
    // undoing the alignment in CSS instead of in world space, so render 1:1 and let the
    // centering leave up to a pixel of slack at the edges.
    scale: {
        mode: Phaser.Scale.NONE,
        autoCenter: Phaser.Scale.CENTER_BOTH,
        width: Math.floor(window.innerWidth / 2) * 2,
        height: Math.floor(window.innerHeight / 2) * 2,
    },


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