import * as THREE from "three";

import plane from "../objects/plane";
import rotatingCube from "../objects/rotatingCube";

function propagateClippingPlanes (object, clippingPlanes) {
    if (object.hasOwnProperty("material")) {
        // console.log("Apply clipping planes to ", object);
        object.material.clippingPlanes = [
            ...clippingPlanes
        ];
    }
    if (object.hasOwnProperty("traverse")) {
        object.traverse(function (child) {
            propagateClippingPlanes(child, clippingPlanes);
        });
    } else if (object.hasOwnProperty("children")) for (let child of object.children) {
        propagateClippingPlanes(child, clippingPlanes);
    }
}

export default async function setupScene (scene, camera, controllers, player) {

    // Set player view
    player.add(camera);

    const sceneGroup = new THREE.Group();

    let sceneX = 0.0;
    let sceneY = 0.0;
    let sceneZ = -5.0;

    // Place objects
    sceneGroup.add(plane);
    sceneGroup.add(rotatingCube);

    scene.add(sceneGroup);

    sceneGroup.translateX(sceneX);
    sceneGroup.translateY(sceneY);
    sceneGroup.translateZ(sceneZ);

    // Get rayspace from controller object and update position relative to plane (floor)
    if (controllers.hasOwnProperty("right") && controllers.right !== null) {

        const { gamepad, raySpace } = controllers.right;

        raySpace.getWorldPosition(plane.position);
        raySpace.getWorldQuaternion(plane.quaternion);
    }

    return function (currentSession, delta, time, sceneDataIn, sceneDataOut, clippingPlanes) {

        if (typeof sceneDataIn === "object" && sceneDataIn != null) {
            console.log("sceneDataIn:", sceneDataIn);
        }

        rotatingCube.rotX(0.01);
        rotatingCube.rotY(0.01);

        if (!!clippingPlanes && clippingPlanes !== null && clippingPlanes.length > 0) {
            propagateClippingPlanes (sceneGroup, clippingPlanes);
        }

        if (typeof sceneDataOut === "function") {
            const data_out = {
                data: "data"
            };

            sceneDataOut(data_out);
        }
    }
}
