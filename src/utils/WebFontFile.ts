import Phaser from 'phaser';

export default class WebFontFile extends Phaser.Loader.File {
    private fontFamily: string;

    constructor(loader: Phaser.Loader.LoaderPlugin, fontFamily: string, fontURL: string) {
        super(loader, {
            type: 'webfont',
            key: fontFamily,
            url: fontURL,
            cache: false
        });

        this.fontFamily = fontFamily;
    }

    load() {
        const fontFace = new FontFace(this.fontFamily, `url(${this.url})`);

        fontFace.load()
            .then((loaded) => {
                (document.fonts as any).add(loaded);
                this.loader.nextFile(this, true);
            })
            .catch(() => {
                this.loader.nextFile(this, false);
            });
    }
}
