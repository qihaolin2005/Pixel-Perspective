import * as Transformations from '../utils/transformations';
import IsoMap from '../map/IsoMap';
import Player from '../player/Player';

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

        if (!this.player.busy) {
            const speed = 2;
            let vx = 0;
            let vy = 0;

            let dir = 'none';

            if (this.player.cursors.up.isDown && this.player.cursors.left.isDown) {
                vx = -2/3 * speed;
                vy = -1/3 * speed;
                dir = 'northwest';
            }
            else if (this.player.cursors.up.isDown && this.player.cursors.right.isDown) {
                vx = 2/3 * speed;
                vy = -1/3 * speed;
                dir = 'northeast';
            }
            else if (this.player.cursors.down.isDown && this.player.cursors.left.isDown) {
                vx = -2/3 * speed;
                vy = 1/3 * speed;
                dir = 'southwest';
            }
            else if (this.player.cursors.down.isDown && this.player.cursors.right.isDown) {
                vx = 2/3 * speed;
                vy = 1/3 * speed;
                dir = 'southeast';
            }
            else if (this.player.cursors.left.isDown) {
                vx = -speed;
                dir = 'west';
            }
            else if (this.player.cursors.right.isDown) {
                vx = speed;
                dir = 'east';
            }
            else if (this.player.cursors.up.isDown) {
                vy = -speed;
                dir = 'north';
            }
            else if (this.player.cursors.down.isDown) {
                vy = speed;
                dir = 'south';
            }
            this.player.setVelocity(vx, vy);

            if (vx !== 0 || vy !== 0) {
                this.player.anims.play(dir, true);
                this.player.direction = dir;
            } else {
                this.player.anims.stop();
            }
        }

        this.player.debug();
        this.player.update();
    }


}