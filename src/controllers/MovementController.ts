import * as Transformations from '../utils/transformations';
import IsoMap from '../map/IsoMap';
import Player from '../player/Player';
import { Scene } from 'phaser';
import type GameScene from '../scenes/GameScene';

export default class MovementController {
    private isoMap: IsoMap;
    private player: Player;
    private floorLayers: any[];

    constructor(isoMap: IsoMap, player: Player) {
        this.isoMap = isoMap;
        this.player = player;
        this.floorLayers = isoMap.getFloorLayers();
        
    }

    update(time: number, delta: number) {
        let vx = 0;
        let vy = 0;
        let dir = this.player.direction;
        if (!this.player.busy) {
            const speed = 2;
            
            if (this.player.keys.up.isDown && this.player.keys.left.isDown) {
                vx = -2/3 * speed;
                vy = -1/3 * speed;
                dir = 'northwest';
            }
            else if (this.player.keys.up.isDown && this.player.keys.right.isDown) {
                vx = 2/3 * speed;
                vy = -1/3 * speed;
                dir = 'northeast';
            }
            else if (this.player.keys.down.isDown && this.player.keys.left.isDown) {
                vx = -2/3 * speed;
                vy = 1/3 * speed;
                dir = 'southwest';
            }
            else if (this.player.keys.down.isDown && this.player.keys.right.isDown) {
                vx = 2/3 * speed;
                vy = 1/3 * speed;
                dir = 'southeast';
            }
            else if (this.player.keys.left.isDown) {
                vx = -speed;
                dir = 'west';
            }
            else if (this.player.keys.right.isDown) {
                vx = speed;
                dir = 'east';
            }
            else if (this.player.keys.up.isDown) {
                vy = -speed;
                dir = 'north';
            }
            else if (this.player.keys.down.isDown) {
                vy = speed;
                dir = 'south';
            }
            this.player.setVelocity(vx, vy);
        }
        else {
            this.player.setVelocity(0, 0);
        }

        if (vx !== 0 || vy !== 0) {
            this.player.anims.play(`walking-${dir}`, true);
            if (!(this.player.scene as GameScene).soundManager.isPlaying('footstep')) {
                (this.player.scene as GameScene).soundManager.play('footstep');
            }

        } else {
            this.player.anims.play(`idle-${dir}`, true);
            (this.player.scene as GameScene).soundManager.pause('footstep');
        }
        this.player.direction = dir;

        this.player.update();
    }


}