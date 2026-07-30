import Phaser from 'phaser';

export const REVEAL_NODE_NAME = 'FilterReveal';

export class RevealFilterController extends Phaser.Filters.Controller {
    playerLocalX = 0;
    playerLocalY = 0;
    radiusX = 0.3;
    radiusY = 0.3;
    revealAlpha = 0.25;
    feather = 0.15;

    constructor(camera: Phaser.Cameras.Scene2D.Camera) {
        super(camera, REVEAL_NODE_NAME);
    }
}

// outTexCoord is 0..1 across exactly this sprite's own bounds (internal filters have no
// padding by default), so it's remapped to the same sprite-centered [-1,1] space that
// RevealManager computes the player's position in - no camera/world-space math needed here.
const fragmentShaderReveal = `
precision mediump float;

uniform sampler2D uMainSampler;
uniform vec2 uPlayerLocal;
uniform vec2 uRadius;
uniform float uRevealAlpha;
uniform float uFeather;

varying vec2 outTexCoord;

#pragma phaserTemplate(fragmentHeader)

void main() {
    vec4 color = boundedSampler(uMainSampler, outTexCoord);

    // Phaser 4 renders internal-filter inputs into a vertically flipped framebuffer
    // relative to normal screen space, so texcoord.y is flipped here to match the
    // same world-space (Y-down) convention RevealManager uses for uPlayerLocal.
    vec2 local = vec2(outTexCoord.x, 1.0 - outTexCoord.y) * 2.0 - 1.0;
    vec2 d = (local - uPlayerLocal) / uRadius;
    float ellipseDist = length(d);

    float revealFactor = smoothstep(1.0 - uFeather, 1.0 + uFeather, ellipseDist);
    float alphaMul = mix(uRevealAlpha, 1.0, revealFactor);

    // Phaser's WebGL renderer composites with premultiplied alpha, so rgb must be
    // scaled down along with alpha - scaling alpha alone brightens the pixel instead
    // of fading it, since the (unpremultiplied-looking) rgb gets blended too strongly.
    color.rgb *= alphaMul;
    color.a *= alphaMul;

    gl_FragColor = color;
}
`;

export class RevealFilterNode extends Phaser.Renderer.WebGL.RenderNodes.BaseFilterShader {
    constructor(manager: Phaser.Renderer.WebGL.RenderNodes.RenderNodeManager) {
        super(REVEAL_NODE_NAME, manager, undefined, fragmentShaderReveal, []);
    }

    setupUniforms(controller: RevealFilterController, drawingContext: Phaser.Renderer.WebGL.DrawingContext) {
        super.setupUniforms(controller, drawingContext);

        const pm = this.programManager;
        pm.setUniform('uPlayerLocal', [controller.playerLocalX, controller.playerLocalY]);
        pm.setUniform('uRadius', [controller.radiusX, controller.radiusY]);
        pm.setUniform('uRevealAlpha', controller.revealAlpha);
        pm.setUniform('uFeather', controller.feather);
    }
}
