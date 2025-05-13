/**
 *  Adapted from https://github.com/simondevyoutube/ThreeJS_Tutorial_3DSound
 *
 *  Functions to initialize and demonstrate audio capabilities in Three.js
 */

import * as THREE from "three";

import { math } from './math.js';
import { noise } from './noise.js';

import loadManager from "../loadManager";

const FS_DECLARATIONS = `

uniform sampler2D audioDataTexture;
uniform vec2 iResolution;
uniform float iTime;

#define M_PI 3.14159
#define NUM_BARS 64.0
#define CIRCLE_RADIUS 0.15
#define BAR_HEIGHT 0.125


// All code snippets taken from Inigo Quilez's site
// Make sure to check out his site!
// https://iquilezles.org/
//
vec3 pal( in float t, in vec3 a, in vec3 b, in vec3 c, in vec3 d) {
    return a + b*cos( 6.28318*(c*t+d) );
}

float dot2(in vec2 v ) { return dot(v,v); }

float sdfTrapezoid(in vec2 p, in float r1, float r2, float he) {
  vec2 k1 = vec2(r2,he);
  vec2 k2 = vec2(r2-r1,2.0*he);
  p.x = abs(p.x);
  vec2 ca = vec2(p.x-min(p.x,(p.y<0.0)?r1:r2), abs(p.y)-he);
  vec2 cb = p - k1 + k2*clamp( dot(k1-p,k2)/dot2(k2), 0.0, 1.0 );
  float s = (cb.x<0.0 && ca.y<0.0) ? -1.0 : 1.0;
  return s*sqrt( min(dot2(ca),dot2(cb)) );
}

float sdUnevenCapsule( vec2 p, float r1, float r2, float h ) {
    p.x = abs(p.x);
    float b = (r1-r2)/h;
    float a = sqrt(1.0-b*b);
    float k = dot(p,vec2(-b,a));
    if( k < 0.0 ) return length(p) - r1;
    if( k > a*h ) return length(p-vec2(0.0,h)) - r2;
    return dot(p, vec2(a,b) ) - r1;
}

float sdTriangleIsosceles( in vec2 p, in vec2 q ) {
    p.x = abs(p.x);
    vec2 a = p - q*clamp( dot(p,q)/dot(q,q), 0.0, 1.0 );
    vec2 b = p - q*vec2( clamp( p.x/q.x, 0.0, 1.0 ), 1.0 );
    float s = -sign( q.y );
    vec2 d = min( vec2( dot(a,a), s*(p.x*q.y-p.y*q.x) ),
                  vec2( dot(b,b), s*(p.y-q.y)  ));
    return -sqrt(d.x)*sign(d.y);
}

float opSmoothUnion( float d1, float d2, float k ) {
  float h = clamp( 0.5 + 0.5*(d2-d1)/k, 0.0, 1.0 );
  return mix( d2, d1, h ) - k*h*(1.0-h);
}

float opUnion( float d1, float d2 ) { return min(d1,d2); }
float opIntersection( float d1, float d2 ) { return max(d1,d2); }
float opSubtraction( float d1, float d2 ) { return max(-d1,d2); }

float sdfBar(vec2 position, vec2 dimensions, vec2 uv, float frequencySample) {
  float w = mix(dimensions.x * 0.5, dimensions.x, smoothstep(0.0, 1.0, frequencySample));
  vec2 basePosition = uv - position + vec2(0.0, -dimensions.y * 0.5 - frequencySample * 0.05);

  float d = sdfTrapezoid(
      basePosition,
      dimensions.x * 0.5,
      w, dimensions.y * 0.5);

  return (d > 0.0 ? 0.0 : 1.0);
}

vec2 rotate2D(vec2 pt, float a) {
	float c = cos(a);
  float s = sin(a);

  mat2 r = mat2(c, s, -s, c);

  return r * pt;
}

vec4 DrawBars(vec2 center, vec2 uv) {
  float barWidth = 2.0 * M_PI * CIRCLE_RADIUS / (NUM_BARS * 1.25);

  vec4 resultColour = vec4(1.0, 1.0, 1.0, 0.0);
  vec2 position = vec2(center.x, center.y + CIRCLE_RADIUS);

  for(int i = 0; i < int(NUM_BARS); i++) {
    float frequencyUV = 0.0;
    
    if (float(i) >= NUM_BARS * 0.5) {
      frequencyUV = 1.0 - ((float(i) - (NUM_BARS * 0.5)) / (NUM_BARS * 0.5));
    } else {
      frequencyUV = float(i) / (NUM_BARS * 0.5);
    }

    float frequencyData = texture(audioDataTexture, vec2(frequencyUV, 0.0)).x;

    float barFinalHeight = BAR_HEIGHT * (0.1 + 0.9 * frequencyData);
    vec2 barDimensions = vec2(barWidth, barFinalHeight);
    vec2 barUvs = rotate2D(uv - center, (2.0 * M_PI * float(i)) / NUM_BARS) + center;

    resultColour.w += sdfBar(position, barDimensions, barUvs, frequencyData);
  }

  float d = saturate(1.1 * ((distance(uv, center) - CIRCLE_RADIUS) / BAR_HEIGHT));
  d = smoothstep(0.0, 1.0, d);
  d = 0.45 + 0.55 * d;
  resultColour.xyz *= pal(d, vec3(0.5,0.5,0.5),vec3(0.5,0.5,0.5),vec3(1.0,1.0,1.0),vec3(0.0,0.20,0.30) );
  resultColour.xyz *= resultColour.w;

  return saturate(resultColour);
}


vec4 AudioVisualizer() {
  float aspect = iResolution.x / iResolution.y;
  vec2 uv = vMapUv * vec2(aspect, 1.0);

  vec2 circleCenter = vec2(aspect * 0.5, 0.5);

  return DrawBars(circleCenter, uv);
}
`;

const mapLoader = new THREE.TextureLoader(loadManager);

const resolution = new THREE.Vector2();

let indexTimer_ = 0;

const vizNoise = new noise.Noise({
    octaves: 3,
    persistence: 0.5,
    lacunarity: 1.6,
    exponentiation: 1.0,
    height: 1.0,
    scale: 0.1,
    seed: 1
});

let previousRAF_ = null;

class LinearSpline {
    constructor(lerp) {
        this.points_ = [];
        this._lerp = lerp;
    }

    AddPoint(t, d) {
        this.points_.push([t, d]);
    }

    Get(t) {
        let p1 = 0;

        for (let i = 0; i < this.points_.length; i++) {
            if (this.points_[i][0] >= t) {
                break;
            }
            p1 = i;
        }

        const p2 = Math.min(this.points_.length - 1, p1 + 1);

        if (p1 == p2) {
            return this.points_[p1][1];
        }

        return this._lerp(
            (t - this.points_[p1][0]) / (
            this.points_[p2][0] - this.points_[p1][0]),
            this.points_[p1][1], this.points_[p2][1]);
    }
}

function loadMaterial (name, tiling, anisotropy) {

    const metalMap = mapLoader.load('material/resources/freepbr/' + name + 'metallic.png');
    metalMap.anisotropy = anisotropy;
    metalMap.wrapS = THREE.RepeatWrapping;
    metalMap.wrapT = THREE.RepeatWrapping;
    metalMap.repeat.set(tiling, tiling);

    const albedo = mapLoader.load('material/resources/freepbr/' + name + 'albedo.png');
    albedo.anisotropy = anisotropy;
    albedo.wrapS = THREE.RepeatWrapping;
    albedo.wrapT = THREE.RepeatWrapping;
    albedo.repeat.set(tiling, tiling);

    const normalMap = mapLoader.load('material/resources/freepbr/' + name + 'normal.png');
    normalMap.anisotropy = anisotropy;
    normalMap.wrapS = THREE.RepeatWrapping;
    normalMap.wrapT = THREE.RepeatWrapping;
    normalMap.repeat.set(tiling, tiling);

    const roughnessMap = mapLoader.load('material/resources/freepbr/' + name + 'roughness.png');
    roughnessMap.anisotropy = anisotropy;
    roughnessMap.wrapS = THREE.RepeatWrapping;
    roughnessMap.wrapT = THREE.RepeatWrapping;
    roughnessMap.repeat.set(tiling, tiling);

    const material = new THREE.MeshStandardMaterial({
        metalnessMap: metalMap,
        map: albedo,
        normalMap: normalMap,
        roughnessMap: roughnessMap,
    });

    return material;
}

function step1_(speaker, analyzer, analyzerData, timeElapsed) {
    const timeElapsedS = timeElapsed * 0.001;

    if (analyzer) {
        indexTimer_ += timeElapsedS * 0.1;

        analyzerData.push([
            ...analyzer.getFrequencyData()
        ]);
        const rows = speaker.speakerMeshes1_.length;
        if (analyzerData.length > rows) {
            analyzerData.shift();
        }

        const colourSpline = new LinearSpline((t, a, b) => {
            const c = a.clone();
            return c.lerp(b, t);
        });
        colourSpline.AddPoint(0.0, new THREE.Color(0xFFFF80));
        colourSpline.AddPoint(0.25, new THREE.Color(0xFF4040));
        colourSpline.AddPoint(1.0, new THREE.Color(0x4040FF));

        const remap = [15, 13, 11, 9, 7, 5, 3, 1, 0, 2, 4, 6, 8, 10, 12, 14];
        for (let r = 0; r < analyzerData.length; ++r) {
            const data = analyzerData[r];
            const speakerRow = speaker.speakerMeshes1_[r];
            for (let i = 0; i < data.length; ++i) {
                const freqScale = math.smootherstep((data[remap[i]]/255) ** 0.5, 0, 1);
                const sc = 1 + 6 * freqScale + vizNoise.Get(indexTimer_, r * 0.42142, i * 0.3455);
                speakerRow[i].scale.set(sc, 1, 1);
                speakerRow[i].material.color.copy(colourSpline.Get(freqScale));
                speakerRow[i].material.emissive.copy(colourSpline.Get(freqScale));
                speakerRow[i].material.emissive.multiplyScalar(freqScale ** 2);
            }
        }
    }
}

function step2_(speaker, analyzer, analyzerTexture, timeElapsed) {
    const timeElapsedS = timeElapsed * 0.001;

    if (analyzer && speaker.visualizerMaterial && speaker.visualizerMaterial.userData.shader) {
        analyzer.getFrequencyData();
        speaker.visualizerMaterial.userData.shader.uniforms.audioDataTexture.value = analyzerTexture;
        speaker.visualizerMaterial.userData.shader.uniforms.iTime.value += timeElapsedS;
        speaker.visualizerMaterial.userData.shader.uniforms.audioDataTexture.value.needsUpdate = true;
    }
}

async function initializeAudio (camera, speaker1, speaker2) {
    const sounds = [];

    const listener_ = new THREE.AudioListener();
    camera.add(listener_);

    const sound1 = new THREE.PositionalAudio(listener_);
    const sound2 = new THREE.PositionalAudio(listener_);

    speaker1.add(sound1);
    speaker2.add(sound2);

    const audioLoader = new THREE.AudioLoader(loadManager);

    const soundPromise1 = new Promise((resolve, reject) => {
        audioLoader.load('audio/MIXST003.mp3', (buffer) => {
            setTimeout(() => {
                sound1.setBuffer(buffer);
                sound1.setLoop(true);
                sound1.setVolume(1.0);
                sound1.setRefDistance(1);
                // sound1.play();

                const analyzer1_ = new THREE.AudioAnalyser(sound1, 32);

                const analyzer1Data_ = [];

                sound1.raf_ = function (t) {
                    if (previousRAF_ === null) {
                        previousRAF_ = t;
                    }

                    const timeElapsed = t - previousRAF_;

                    step1_(speaker1, analyzer1_, analyzer1Data_, timeElapsed);

                    previousRAF_ = t;
                }

                resolve(sound1);

            }, 5000);
        });
    });

    sounds.push(soundPromise1);

    const soundPromise2 = new Promise((resolve, reject) => {
        audioLoader.load('audio/MIXST003.mp3', (buffer) => {
            setTimeout(() => {
                sound2.setBuffer(buffer);
                sound2.setLoop(true);
                sound2.setVolume(1.0);
                sound2.setRefDistance(1);
                // sound2.play();

                const analyzer2_ = new THREE.AudioAnalyser(sound2, 128);
                const analyzer2Texture_ = new THREE.DataTexture(
                    analyzer2_.data, 64, 1, THREE.RedFormat);
                analyzer2Texture_.magFilter = THREE.LinearFilter;

                sound2.raf_ = function (t) {
                    if (previousRAF_ === null) {
                        previousRAF_ = t;
                    }

                    const timeElapsed = t - previousRAF_;

                    step2_(speaker2, analyzer2_, analyzer2Texture_, timeElapsed);

                    previousRAF_ = t;
                }

                resolve(sound2);

            }, 5000);
        });
    });

    sounds.push(soundPromise2);

    return sounds;
}

export default async function (renderer, scene, camera) {

    const maxAnisotropy = renderer.capabilities.getMaxAnisotropy();

    const speaker1Material = loadMaterial('worn_metal4_', 1, maxAnisotropy);
    const speaker1 = new THREE.Mesh(
        new THREE.BoxGeometry(1, 8, 4),
        speaker1Material);
    speaker1.position.set(-10, 4, 0);
    speaker1.speakerMeshes1_ = [];
    speaker1.castShadow = true;
    speaker1.receiveShadow = true;

    const speaker1Geo = new THREE.BoxGeometry(0.25, 0.25, 0.25);
    const speaker1BoxMaterial = loadMaterial('broken_down_concrete2_', 1, maxAnisotropy);
    const speaker1Group = new THREE.Group();
    speaker1Group.position.x = 0.5 + 0.125;

    for (let x = -5; x <= 5; ++x) {
        const row = [];
        for (let y = 0; y < 16; ++y) {
            const speaker1_1 = new THREE.Mesh(
                speaker1Geo,
                speaker1BoxMaterial.clone());
            speaker1_1.position.set(0, y*0.35 - 3, x * 0.35);
            speaker1_1.castShadow = true;
            speaker1_1.receiveShadow = true;
            speaker1Group.add(speaker1_1);
            row.push(speaker1_1);
        }
        speaker1.speakerMeshes1_.push(row);
    }
    speaker1.add(speaker1Group);

    const speaker2 = new THREE.Mesh(
        new THREE.BoxGeometry(1, 8, 4),
        new THREE.MeshStandardMaterial({color: 0x404040, roughness: 0.1, metalness: 0 }));
    speaker2.position.set(10, 4, 0);
    speaker2.castShadow = true;
    speaker2.receiveShadow = true;

    const diffuseMap = mapLoader.load('material/resources/background-grey-dots.png');
    diffuseMap.anisotropy = maxAnisotropy;

    speaker2.visualizerMaterial = new THREE.MeshStandardMaterial({
        map: diffuseMap,
        normalMap: mapLoader.load('material/resources/freepbr/flaking-plaster_normal-ogl.png'),
        roughnessMap: mapLoader.load('material/resources/freepbr/flaking-plaster_roughness.png'),
        metalnessMap: mapLoader.load('material/resources/freepbr/flaking-plaster_metallic.png'),
    });

    speaker2.visualizerMaterial.onBeforeCompile = (shader) => {
        resolution.set(window.innerWidth, window.innerHeight);
        shader.uniforms.uResolution = new THREE.Uniform(resolution);

        shader.uniforms.iTime = { value: 0.0 };
        shader.uniforms.iResolution = {value: new THREE.Vector2(128, 256)};
        shader.uniforms.audioDataTexture = {value: null};

        shader.fragmentShader = shader.fragmentShader.replace('void main()', FS_DECLARATIONS + 'void main()');
        shader.fragmentShader = shader.fragmentShader.replace('totalEmissiveRadiance = emissive;', `
      
        totalEmissiveRadiance = emissive + AudioVisualizer().xyz;

        `);
        speaker2.visualizerMaterial.userData.shader = shader;
    };

    speaker2.visualizerMaterial.customProgramCacheKey = () => {
        return 'visualizerMaterial';
    };

    const speaker2Screen = new THREE.Mesh(
        new THREE.PlaneGeometry(4, 8),
        speaker2.visualizerMaterial
    );
    speaker2Screen.castShadow = false;
    speaker2Screen.receiveShadow = true;
    speaker2Screen.rotation.y = -Math.PI / 2;
    speaker2Screen.position.x -= 0.51;
    speaker2.add(speaker2Screen);

    scene.add(speaker1);
    scene.add(speaker2);

    const sounds = await initializeAudio(camera, speaker1, speaker2);

    return [
        ...sounds
    ];
}
