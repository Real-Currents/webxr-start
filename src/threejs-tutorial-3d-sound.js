/**
 *  Adapted from https://github.com/simondevyoutube/ThreeJS_Tutorial_3DSound
 *
 *  Functions to initialize and demonstrate audio capabilities in Three.js
 */

import * as THREE from "three";


const mapLoader = new THREE.TextureLoader();

function initializeAudio_(camera) {
    const listener_ = new THREE.AudioListener();
    camera_.add(listener_);

    const sound1 = new THREE.PositionalAudio(listener_);
    const sound2 = new THREE.PositionalAudio(listener_);

    speaker1.add(sound1);
    speaker2.add(sound2);

    const loader = new THREE.AudioLoader();
    loader.load('resources/music/Ectoplasm.mp3', (buffer) => {
        setTimeout(() => {
            sound1.setBuffer(buffer);
            sound1.setLoop(true);
            sound1.setVolume(1.0);
            sound1.setRefDistance(1);
            sound1.play();

            const analyzer1_ = new THREE.AudioAnalyser(sound1, 32);
            const analyzer1Data_ = [];
        }, 5000);
    });

    loader.load('resources/music/AcousticRock.mp3', (buffer) => {
        setTimeout(() => {
            sound2.setBuffer(buffer);
            sound2.setLoop(true);
            sound2.setVolume(1.0);
            sound2.setRefDistance(1);
            sound2.play();

            const analyzer2_ = new THREE.AudioAnalyser(sound2, 128);
            const analyzer2Texture_ = new THREE.DataTexture(
                analyzer2_.data, 64, 1, THREE.RedFormat);
            analyzer2Texture_.magFilter = THREE.LinearFilter;
        }, 5000);
    });

    const indexTimer_ = 0;
    const noise1_ = new noise.Noise({
        octaves: 3,
        persistence: 0.5,
        lacunarity: 1.6,
        exponentiation: 1.0,
        height: 1.0,
        scale: 0.1,
        seed: 1
    });
}

function loadMaterial_(name, tiling, anisotropy) {

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

export default function (renderer, scene, camera) {

    const maxAnisotropy = renderer.capabilities.getMaxAnisotropy();

    const speaker1Material = loadMaterial_('worn_metal4_', 1, maxAnisotropy);
    const speaker1 = new THREE.Mesh(
        new THREE.BoxGeometry(1, 8, 4),
        speaker1Material);
    speaker1.position.set(-10, 4, 0);
    speaker1.castShadow = true;
    speaker1.receiveShadow = true;

    const speaker1Geo = new THREE.BoxGeometry(0.25, 0.25, 0.25);
    const speaker1BoxMaterial = loadMaterial_('broken_down_concrete2_', 1, maxAnisotropy);
    const speakerMeshes1_ = [];
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
        speakerMeshes1_.push(row);
    }
    speaker1.add(speaker1Group);

    const speaker2 = new THREE.Mesh(
        new THREE.BoxGeometry(1, 8, 4),
        new THREE.MeshStandardMaterial({color: 0x404040, roughness: 0.1, metalness: 0 }));
    speaker2.position.set(10, 4, 0);
    speaker2.castShadow = true;
    speaker2.receiveShadow = true;

    const diffuseMap = mapLoader.load('resources/background-grey-dots.png');
    diffuseMap.anisotropy = maxAnisotropy;

    const visualizerMaterial = new THREE.MeshStandardMaterial({
        map: diffuseMap,
        normalMap: mapLoader.load('resources/freepbr/flaking-plaster_normal-ogl.png'),
        roughnessMap: mapLoader.load('resources/freepbr/flaking-plaster_roughness.png'),
        metalnessMap: mapLoader.load('resources/freepbr/flaking-plaster_metallic.png'),
    });

    // visualizerMaterial.onBeforeCompile = (shader) => {
    //     shader.uniforms.iTime = { value: 0.0 };
    //     shader.uniforms.iResolution = {value: new THREE.Vector2(128, 256)};
    //     shader.uniforms.audioDataTexture = {value: null};
    //
    //     shader.fragmentShader = shader.fragmentShader.replace('void main()', FS_DECLARATIONS + 'void main()');
    //     shader.fragmentShader = shader.fragmentShader.replace('totalEmissiveRadiance = emissive;', `
    //
    //   totalEmissiveRadiance = emissive + AudioVisualizer().xyz;
    //
    //   `);
    //     visualizerMaterial.userData.shader = shader;
    // };
    //
    // visualizerMaterial.customProgramCacheKey = () => {
    //     return 'visualizerMaterial';
    // };

    // const speaker2Screen = new THREE.Mesh(
    //     new THREE.PlaneGeometry(4, 8),
    //     visualizerMaterial);
    // speaker2Screen.castShadow = false;
    // speaker2Screen.receiveShadow = true;
    // speaker2Screen.rotation.y = -Math.PI / 2;
    // speaker2Screen.position.x -= 0.51;
    // speaker2.add(speaker2Screen);

    scene.add(speaker1);
    scene.add(speaker2);
}
