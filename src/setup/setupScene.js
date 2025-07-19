// import * as THREE from "three";
// import plane from "../objects/plane";
import plane from "../objects/smallPlane";
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

    return function updateScene (currentSession, delta, time, sceneDataIn, sceneDataOut) {

        const data_out = {};

        rotatingCube.rotX(0.01);
        rotatingCube.rotY(0.01);

        if (typeof sceneDataIn === "object" && sceneDataIn != null) {
            console.log("sceneDataIn:", sceneDataIn);
        }

        if (typeof sceneDataOut === "function") {
            sceneDataOut(data_out);
        }
    }
}
