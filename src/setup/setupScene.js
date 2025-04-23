import * as THREE from "three";
import loadManager from "../loadManager";
import plane from "../objects/plane";
import rotatingCube from "../objects/rotatingCube";
import setupThreejsTutorial3dSound from "../threejs-tutorial-3d-sound";

const sound_data = [];
let sound_data_loaded = false;

export default async function setupScene (renderer, scene, camera, controllers, player) {

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

        rotatingCube.rotX(0.01);
        rotatingCube.rotY(0.01);

        if (!sound_data_loaded) {
            if (data_out.sound_data.length > 1) {

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
                                    sound.play();
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
