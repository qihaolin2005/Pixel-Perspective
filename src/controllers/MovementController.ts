import * as Transformations from '../utils/transformations.ts';
import IsoMap from '../map/IsoMap.ts';
import Player from '../player/Player.ts';

export default class MovementController {
    private isoMap: IsoMap;
    private player: Player;
    private floorLayers: any[];

    constructor(isoMap: IsoMap, player: Player) {
        this.isoMap = isoMap;
        this.player = player;
        this.floorLayers = isoMap.getFloorLayers();
    }


    // getInput() {
    //     return {
    //         up: this.cursors.up.isDown,
    //         down: this.cursors.down.isDown,
    //         left: this.cursors.left.isDown,
    //         right: this.cursors.right.isDown
    //     };
    // }
    update(time: number, delta: number) {
        const speed = 150;
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


        const dt = delta / 1000;

        if (this.checkValidMovement(vx, 0, delta)) {
            this.player.x += vx * dt;
        }
        if (this.checkValidMovement(0, vy, delta)) {
            this.player.y += vy * dt;
        }

        if (vx !== 0 || vy !== 0) {
            this.player.anims.play(dir, true);
        } else {
            this.player.anims.stop();
        }

        this.player.debug();
    }

    checkValidMovement(vx: number, vy: number, delta: number) {
        const currentTileCoords = Transformations.worldToIsoCoords(
            this.player.x + (vx * delta/1000), this.player.y + (vy * delta/1000),
             this.isoMap.tileWidth, this.isoMap.tileHeight,
              this.isoMap.xOffset);
        //console.log('currentTileCoords', currentTileCoords);
        const currentTile = this.floorLayers[this.player.getCurrentLayer()].data[currentTileCoords.y][currentTileCoords.x];
        
        if (currentTile.properties.walkable) {
            return true;
        } else {
            return false;
        }
    }


}