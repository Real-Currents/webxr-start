import * as THREE from "three";

import plane from "../objects/plane";
import rotatingCube from "../objects/rotatingCube";

let uniforms;

export default async function setupScene (scene, camera, controllers, player) {

    uniforms = {
        time: { value: 1.0 }
    }

    const material = new THREE.ShaderMaterial({
        uniforms: uniforms,
        vertexShader: document.getElementById( 'vertexShader' ).textContent,
        fragmentShader: document.getElementById( 'fragmentShader' ).textContent

    });

    plane.material = material;

    // Set player view
    player.add(camera);

    // Place objects
    scene.add(plane);
    scene.add(rotatingCube);

    // Get rayspace from controller object and update position relative to plane (floor)
    if (controllers.hasOwnProperty("right") && controllers.right !== null) {

        const { gamepad, raySpace } = controllers.right;

        raySpace.getWorldPosition(plane.position);
        raySpace.getWorldQuaternion(plane.quaternion);
    }

    return function (currentSession, delta, time, sceneDataUpdate, sendDOMDataUpdate) {

        uniforms[ 'time' ].value = performance.now() / 1000;

        rotatingCube.rotX(0.01);
        rotatingCube.rotY(0.01);

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
