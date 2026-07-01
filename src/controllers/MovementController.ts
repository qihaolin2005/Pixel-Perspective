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

        if (!this.checkValidMovement(vx, 0, delta)) {
            //this.player.x += vx * dt;
            vx = 0;
        }
        if (!this.checkValidMovement(0, vy, delta)) {
            //this.player.y += vy * dt;
            vy = 0;
        }

        this.player.setVelocity(vx, vy);

        if (vx !== 0 || vy !== 0) {
            this.player.anims.play(dir, true);
        } else {
            this.player.anims.stop();
        }

        this.player.debug();
    }
    
    checkValidMovement(vx: number, vy: number, delta: number) {
        const foot = vx < 0 ? this.player.footprint[0] : this.player.footprint[1];

        let fx = foot!.x;
        let fy = foot!.y;

        console.log('foot:', foot);
        let currentTileCoords = Transformations.worldToIsoCoords(
        this.player.x + 16 + fx + (vx * delta/1000), this.player.y + fy + (vy * delta/1000),
            this.isoMap.tileWidth, this.isoMap.tileHeight,
            this.isoMap.xOffset);
        let currentTile = this.floorLayers[this.player.getCurrentLayer()].data[currentTileCoords.y][currentTileCoords.x];
        if (!currentTile.properties.walkable) {
            return false;
        }

        // for (let i = 0; i < this.player.footprint.length; i++) {
        //     let fx = this.player.footprint[i]!.x;
        //     let fy = this.player.footprint[i]!.y;
        //     let currentTileCoords = Transformations.worldToIsoCoords(
        //     this.player.x + 16 + fx + (vx * delta/1000), this.player.y + fy + (vy * delta/1000),
        //      this.isoMap.tileWidth, this.isoMap.tileHeight,
        //       this.isoMap.xOffset);
        //     let currentTile = this.floorLayers[this.player.getCurrentLayer()].data[currentTileCoords.y][currentTileCoords.x];
        //     if (!currentTile.properties.walkable) {
        //         return false;
        //     }
        // }
        return true;
    }


}