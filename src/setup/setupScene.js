import * as THREE from "three";
import { GLTFLoader } from "three/examples/jsm/loaders/GLTFLoader";

import loadManager from "../loadManager";
import plane from "../objects/plane";
import rotatingCube from "../objects/rotatingCube";
import setupThreejsTutorial3dSound from "../threejs-tutorial-3d-sound";

const gltfLoader = new GLTFLoader(loadManager);

const gloveGroup_01 = new THREE.Group();
const gloveGroup_02 = new THREE.Group();

const sound_data = [];
let sound_data_loaded = false;

export default async function setupScene (renderer, scene, camera, controllers, player) {

    // Set player view
    player.add(camera);

    // Place objects
    // scene.add(plane);
    // scene.add(rotatingCube);

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

    const wait_for_sounds_to_load = setupThreejsTutorial3dSound(renderer, scene, camera);

    wait_for_sounds_to_load
        .then((sounds) => {
            for (const sp of sounds) {
                sp
                    .then(async (sound) => {
                        console.log("sound:", (await sound));

                        sound_data.push(sound);
                    })
            }
        });

    return function updateScene (currentSession, delta, time, sceneDataIn, sceneDataOut) {

        const data_out = {
            events: [],
            sound_data: [
                ...sound_data
            ]
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

            raySpace_02.getWorldPosition(plane.position);
            raySpace_02.getWorldQuaternion(plane.quaternion);

            // Attach the glove to the right controller
            if (!raySpace_02.children.includes(gloveGroup_02)) {
                raySpace_02.add(gloveGroup_02);
                mesh_02.visible = false; // Hide the default controller model
            }
        }

        rotatingCube.rotX(0.01);
        rotatingCube.rotY(0.01);

        if (data_out.sound_data.length > 0) {
            for (const sound of data_out["sound_data"]) {
                sound.raf_(delta); // request animation frame for sound
            }

            if (!sound_data_loaded) {

                console.log(data_out);

                data_out.events.push({
                    "action": "sounds_ready"
                });

                sound_data_loaded = true;
            }
        }

        if (typeof sceneDataIn === "object" && sceneDataIn != null) {
            console.log("sceneDataIn:", sceneDataIn);
            // loadManager.addLoadHandler(async () => {

                if ("events" in sceneDataIn) {
                    for (const event of sceneDataIn["events"]) {
                        if ("action" in event) {
                            if (event["action"] == "play_sounds") {
                                for (const sound of data_out["sound_data"]) {
                                    sound.play(); // play sound
                                }
                            }
                        }
                    }
                }

            // });
        }

        if (typeof sceneDataOut === "function") {
            sceneDataOut(data_out);
        }
    }
}
