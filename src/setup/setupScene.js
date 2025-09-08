import * as THREE from "three";


export default async function setupScene (scene, camera, controllers, player) {

    // Set player view
    player.add(camera);

    return function updateScene (currentSession, delta, time, sceneDataIn, sceneDataOut) {

        const data_out = {};

        if (typeof sceneDataIn === "object" && sceneDataIn != null) {
            console.log("sceneDataIn:", sceneDataIn);
        }

        if (typeof sceneDataOut === "function") {
            sceneDataOut(data_out);
        }
    }
}
