import plane from "../objects/plane";
import rotatingCube from "../objects/rotatingCube";


export default async function setupScene (scene, camera, controllers, player) {

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
