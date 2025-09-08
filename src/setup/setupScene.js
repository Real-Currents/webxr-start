import * as THREE from "three";
import { GLTFLoader } from "three/examples/jsm/loaders/GLTFLoader";

import loadManager from "../setup/setupLoadManager";

const gltfLoader = new GLTFLoader(loadManager);

const gloveGroup_01 = new THREE.Group();
const gloveGroup_02 = new THREE.Group();

export default async function setupScene (scene, camera, controllers, player) {

    // Set player view
    player.add(camera);

    // Get rayspace from controller object and update position relative to plane (floor)
    if (controllers.hasOwnProperty("right") && controllers.right !== null) {

        const { gamepad, raySpace } = controllers.right;
    }

    // Load the glove model
    gltfLoader.load('assets/glove_01.glb', (gltf) => {
        gloveGroup_01.add(gltf.scene);
    });

    // Load the glove model
    gltfLoader.load('assets/glove_02.glb', (gltf) => {
        gloveGroup_02.add(gltf.scene);
    });

    return function updateScene (currentSession, delta, time, sceneDataIn, sceneDataOut) {

        const data_out = {
            events: []
        };

        if (controllers.hasOwnProperty("left") && controllers.left !== null) {

            const gamepad_01 = controllers.left.gamepad,
                raySpace_01 = controllers.left.raySpace,
                mesh_01 = controllers.left.mesh;

            // Attach the glove to the right controller
            if (!raySpace_01.children.includes(gloveGroup_01)) {
                raySpace_01.add(gloveGroup_01);
                mesh_01.visible = false; // Hide the default controller model
            }
        }

        if (controllers.hasOwnProperty("right") && controllers.right !== null) {

            const gamepad_02 = controllers.right.gamepad,
                raySpace_02 = controllers.right.raySpace,
                mesh_02 = controllers.right.mesh;

            // raySpace_02.getWorldPosition(plane.position);
            // raySpace_02.getWorldQuaternion(plane.quaternion);

            // Attach the glove to the right controller
            if (!raySpace_02.children.includes(gloveGroup_02)) {
                raySpace_02.add(gloveGroup_02);
                mesh_02.visible = false; // Hide the default controller model
            }
        }

        if (typeof sceneDataIn === "object" && sceneDataIn != null) {
            console.log("sceneDataIn:", sceneDataIn);
        }

        if (typeof sceneDataOut === "function") {
            sceneDataOut(data_out);
        }
    }
}
