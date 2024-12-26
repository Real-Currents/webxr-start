import * as THREE from "three";

import { RenderPass } from 'three/addons/postprocessing/RenderPass.js';
import { BloomPass } from 'three/addons/postprocessing/BloomPass.js';
import { OutputPass } from 'three/addons/postprocessing/OutputPass.js';

import plane from "../objects/plane";
// import rotatingCube from "../objects/rotatingCube";
import rotatingTorus from "../objects/rotatingTorus";
import loadManager from "../loadManager";

const rotatingMesh = rotatingTorus; // rotatingMesh;
let uniforms, mesh;

export default async function setupScene (scene, camera, composer, controllers, player) {

    // Set player view
    player.add(camera);
    // Based on https://github.com/mrdoob/three.js/blob/master/examples/webgl_shader_lava.html
    const textureLoader = new THREE.TextureLoader(loadManager);

    const cloudTexture = textureLoader.load( 'material/textures/lava/cloud.png' );
    const lavaTexture = textureLoader.load( 'material/textures/lava/lavatile.jpg' );

    lavaTexture.colorSpace = THREE.SRGBColorSpace;

    cloudTexture.wrapS = cloudTexture.wrapT = THREE.RepeatWrapping;
    lavaTexture.wrapS = lavaTexture.wrapT = THREE.RepeatWrapping;

    uniforms = {
        'fogDensity': { value: 0.45 },
        'fogColor': { value: new THREE.Vector3( 0, 0, 0 ) },
        'time': { value: 1.0 },
        'uvScale': { value: new THREE.Vector2( 3.0, 1.0 ) },
        'texture1': { value: cloudTexture },
        'texture2': { value: lavaTexture }
    };

    rotatingMesh.material = new THREE.ShaderMaterial({
        uniforms: uniforms,
        vertexShader: document.getElementById( 'vertexShader' ).textContent,
        fragmentShader: document.getElementById( 'fragmentShader' ).textContent
    });

    // Place objects
    scene.add(plane);
    scene.add(rotatingMesh);

    composer.addPass(new RenderPass( scene, camera ));
    composer.addPass(new BloomPass( 1.25 )); // <= blurry?
    composer.addPass(new OutputPass());

    // Get rayspace from controller object and update position relative to plane (floor)
    if (controllers.hasOwnProperty("right") && controllers.right !== null) {

        const { gamepad, raySpace } = controllers.right;

        raySpace.getWorldPosition(plane.position);
        raySpace.getWorldQuaternion(plane.quaternion);
    }

    return function (currentSession, delta, time, sceneDataUpdate, sendDOMDataUpdate) {

        uniforms[ 'time' ].value += 0.2 * (5 * delta);

        // mesh.rotation.y += 0.0125 * (5 * delta);
        // mesh.rotation.x += 0.05 * (5 * delta);

        rotatingMesh.rotX(0.0125 * (5 * delta));
        rotatingMesh.rotY(0.05 * (5 * delta));

        if (typeof sceneDataUpdate === "object" && sceneDataUpdate != null) {
            console.log("sceneDataUpdate:", sceneDataUpdate);
        }

        if (typeof sendDOMDataUpdate === "function") {
            const domDataUpdate = {
                data: "data"
            };

            sendDOMDataUpdate(domDataUpdate);
        }
    }
}
