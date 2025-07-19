import * as THREE from "three";
import plane from "../objects/smallPlane";
import redMetallicBox from "../objects/redMetallicBox";

export default async function setupScene (scene, camera, controllers, player) {

    // Set player view
    player.add(camera);

    // Add lighting based on Blender scene data
    // Point light at position (4.0762, 1.0055, 5.9039) with energy 1000
    const pointLight = new THREE.PointLight(0xffffff, 1, 100);
    pointLight.position.set(4.0762, 5.9039, 1.0055); // Adjusted for Three.js coordinates
    pointLight.castShadow = true;
    pointLight.shadow.mapSize.width = 2048;
    pointLight.shadow.mapSize.height = 2048;
    pointLight.shadow.camera.near = 0.5;
    pointLight.shadow.camera.far = 500;
    scene.add(pointLight);

    // Add ambient light for better visibility
    const ambientLight = new THREE.AmbientLight(0x404040, 0.4);
    scene.add(ambientLight);

    // Place objects
    scene.add(plane);
    
    // Replace the original textured rotating cube with red metallic box from Blender
    scene.add(redMetallicBox);
    
    // Position red metallic box where the original rotating cube was (y = 2)
    redMetallicBox.position.set(0, 1.0, 0);

    // Get rayspace from controller object and update position relative to plane (floor)
    if (controllers.hasOwnProperty("right") && controllers.right !== null) {

        const { gamepad, raySpace } = controllers.right;

        raySpace.getWorldPosition(plane.position);
        raySpace.getWorldQuaternion(plane.quaternion);
    }

    return function (currentSession, delta, time, sceneDataUpdate, sendDOMDataUpdate) {

        // Rotate the red metallic box (replacing the original rotatingCube animation)
        redMetallicBox.rotX(0.01);
        redMetallicBox.rotY(0.01);

        if (typeof sceneDataUpdate === "object" && sceneDataUpdate != null) {
            console.log("sceneDataUpdate:", sceneDataUpdate);
        }

        if (typeof sendDOMDataUpdate === "function") {
            const domDataUpdate = {
                data: "Red metallic box from Blender scene",
                redMetallicBox: {
                    position: redMetallicBox.position,
                    rotation: {
                        x: redMetallicBox.rotation.x,
                        y: redMetallicBox.rotation.y,
                        z: redMetallicBox.rotation.z
                    }
                }
            };

            sendDOMDataUpdate(domDataUpdate);
        }
    }
}
