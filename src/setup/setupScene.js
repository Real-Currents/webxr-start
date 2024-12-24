import * as THREE from "three";


export default async function setupScene (scene, camera, controllers, player) {

    // Set player view
    player.add(camera);

    return function (currentSession, delta, time, sceneDataUpdate, sendDOMDataUpdate) {

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
