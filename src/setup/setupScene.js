import * as THREE from "three";

// import loadManager from "../loadManager";
import plane from "../objects/plane";
import rotatingCube from "../objects/rotatingCube";
import rotatingTorus from "../objects/rotatingTorus";

const rotatingMesh = rotatingTorus;
let uniforms, mesh;

export default async function setupScene (renderer, scene, camera, composer, controllers, player) {

    // Set player view
    player.add(camera);

    // // Get A WebGL context
    // const gl = renderer.getContext();

    uniforms = {
        // fogDensity: { value: 0.45 },
        // fogColor: { value: new THREE.Vector3( 0, 0, 0 ) },
        // uvScale: { value: new THREE.Vector2( 3.0, 1.0 ) },
        // texture1: { value: cloudTexture },
        // texture2: { value: lavaTexture },
        time: { value: 1.0 },
    };

    rotatingMesh.material = new THREE.ShaderMaterial({
        uniforms: uniforms,
        vertexShader: document.getElementById( 'vertexShader' ).textContent,
        fragmentShader: document.getElementById( 'fragmentShader' ).textContent
    });

    // Place objects
    scene.add(plane);
    scene.add(rotatingCube);
    scene.add(rotatingMesh);

    // Get rayspace from controller object and update position relative to plane (floor)
    if (controllers.hasOwnProperty("right") && controllers.right !== null) {

        const { gamepad, raySpace } = controllers.right;

        raySpace.getWorldPosition(plane.position);
        raySpace.getWorldQuaternion(plane.quaternion);
    }

    return function (currentSession, delta, time, sceneDataUpdate, sendDOMDataUpdate) {

        rotatingCube.rotX(0.01);
        rotatingCube.rotY(0.01);

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
