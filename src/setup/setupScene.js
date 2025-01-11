import * as THREE from "three";

import rotatingCube from "../objects/rotatingCube";

let uniforms;

export default async function setupScene (scene, camera, controllers, player, mapLayers, setLayer) {

    // Set player view
    player.add(camera);

    function createPlane(width, height, color) {
        const geometry = new THREE.PlaneGeometry(width, height, 1, 1);
        const material = new THREE.MeshPhysicalMaterial({ color });
        return new THREE.Mesh(geometry, material);
    }

    const groundOutsideMesh = createPlane(4, 4, 0x00FF00);
    groundOutsideMesh.rotation.set(-Math.PI * 0.5, 0, 0);
    setLayer(groundOutsideMesh, mapLayers.get("outside"));
    scene.add(groundOutsideMesh);

    const groundInsideMesh = createPlane(4, 4, 0x0000FF);
    groundInsideMesh.rotation.set(-Math.PI * 0.5, 0, 0);
    setLayer(groundInsideMesh, mapLayers.get("inside"));
    scene.add(groundInsideMesh);

    // Place other objects
    setLayer(rotatingCube, mapLayers.get("inside"));
    scene.add(rotatingCube);

    return function (currentSession, delta, time, data_in, sendData_out) {

        const data_out = {};

        rotatingCube.rotX(0.01);
        rotatingCube.rotY(0.01);

        if (typeof data_in === "object" && data_in != null) {
            console.log("data_in:", data_in);
        }

        if (data_out.hasOwnProperty("event") && typeof sendData_out === "function") {
            sendData_out(data_out);
        }
    }
}
