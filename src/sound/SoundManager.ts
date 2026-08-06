import GameScene from "../scenes/GameScene";

export default class SoundManager {
    public scene: GameScene;
    private sounds: Map<string, Phaser.Sound.BaseSound>;

    constructor(scene: GameScene) {
        this.scene = scene;
        this.sounds = new Map<string, Phaser.Sound.BaseSound>;
    }

    add(key: string, config: Phaser.Types.Sound.SoundConfig = {}) {
        this.sounds.set(key, this.scene.sound.add(key, config));
    }

    play(key: string, config: Phaser.Types.Sound.SoundConfig = {}) {
        const sound = this.sounds.get(key);
        if (sound) {
            if (sound.isPaused) {
                sound.resume();
            }
            else {
                sound.play(config);
            }
        }
        else {
            console.log(`${key} is not a valid sound`);
        }
    }

    isPlaying(key: string) {
        const sound = this.sounds.get(key);
        return sound?.isPlaying;
    }

    stop(key: string) {
        const sound = this.sounds.get(key);
        if (sound) {
            sound.stop();
        }
    }

    pause(key: string) {
        const sound = this.sounds.get(key);
        if (sound) {
            sound.pause();
        }
    }

}