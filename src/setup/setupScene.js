import * as THREE from "three";

import plane from "../objects/plane";
import rotatingCube from "../objects/rotatingCube";

const mapColors = new Map();
mapColors.set("white", new THREE.Color(0xffffff));
mapColors.set("grey", new THREE.Color(0xdddddd));
mapColors.set("orangeLight", new THREE.Color(0xffd5c9));
mapColors.set("orangeDark", new THREE.Color(0xfbb282));
mapColors.set("green", new THREE.Color(0xc8d3cb));
mapColors.set("blue", new THREE.Color(0xbbd1de));

const sceneObjects = [];

export default function setupScene (scene, camera, controllers, player, mapLayers, setLayer) {

    // Set player view
    player.add(camera);

// // Setup World
//     function createPlane(width, height, color) {
//         const geometry = new THREE.PlaneGeometry(width, height, 1, 1);
//         const material = new THREE.MeshPhysicalMaterial({ color });
//         return new THREE.Mesh(geometry, material);
//     }
//
//     function createSphere(color) {
//         const geometry = new THREE.SphereGeometry(7, 32, 32);
//         const material = new THREE.MeshPhysicalMaterial({
//             color,
//             side: THREE.BackSide
//         });
//         return new THREE.Mesh(geometry, material);
//     }
//
//     function createBox(width, height, depth, color) {
//         const geometry = new THREE.BoxGeometry(width, height, depth);
//         const material = new THREE.MeshPhysicalMaterial({ color });
//         const mesh = new THREE.Mesh(geometry, material);
//         mesh.position.y += height * 0.5;
//
//         const wrapper = new THREE.Object3D();
//         wrapper.add(mesh);
//         return wrapper;
//     }

    function createTorus(color) {
        const geometry = new THREE.TorusKnotGeometry(0.25, 0.03, 100, 16);
        const material = new THREE.MeshPhysicalMaterial({
            color,
            side: THREE.DoubleSide
        });
        return new THREE.Mesh(geometry, material);
    }

//     const directionalLight = new THREE.DirectionalLight(0xffffff, 0.8);
//     directionalLight.position.set(0, 1, 1);
//     sceneObjects.push(directionalLight);
//
//     const hemisphereLight = new THREE.HemisphereLight(0xffffff, 0xffffff, 1);
//     sceneObjects.push(hemisphereLight);
//
//     const skyOutsideMesh = createSphere(mapColors.get("blue"));
//     // setLayer(skyOutsideMesh, mapLayers.get("outside"));
//     sceneObjects.push(skyOutsideMesh);
//
//     const groundInsideMesh = createPlane(4, 4, mapColors.get("orangeLight"));
//     groundInsideMesh.rotation.set(-Math.PI * 0.5, 0, 0);
//     // setLayer(groundInsideMesh, mapLayers.get("outside"));
//     sceneObjects.push(groundInsideMesh);
//
//     const boxMesh = createBox(0.2, 1, 0.2, mapColors.get("green"));
//     boxMesh.position.set(0, 0, -0.3);
//     // setLayer(boxMesh, mapLayers.get("outside"));
//     sceneObjects.push(boxMesh);
//
//     const boxMesh2 = createBox(0.2, 0.2, 0.2, mapColors.get("green"));
//     boxMesh2.position.set(-0.4, 0, 0.2);
//     // setLayer(boxMesh2, mapLayers.get("outside"));
//     sceneObjects.push(boxMesh2);
//
//     const boxMesh3 = createBox(0.2, 0.15, 0.2, mapColors.get("green"));
//     boxMesh3.position.set(0.4, 0, 0.2);
//     // setLayer(boxMesh3, mapLayers.get("outside"));
//     sceneObjects.push(boxMesh3);

    const torusMesh = createTorus(mapColors.get("grey"));
    torusMesh.position.set(0, 1, 0);
    sceneObjects.push(torusMesh);

    function updateTorus() {
        torusMesh.rotation.x += 0.01;
        torusMesh.rotation.y += 0.01;
    }

    // Place other objects
    sceneObjects.push(plane);
    sceneObjects.push(rotatingCube);
    rotatingCube.position.y = 1;
    setLayer(rotatingCube, mapLayers.get("outside"));
    
    sceneObjects.forEach(m => scene.add(m));

    return function (currentSession, delta, time, data_in, sendData_out) {
        const data_out = {};

        if (typeof data_in === "object" && data_in != null) {

            if ((data_in.hasOwnProperty("action"))) {
                console.log("data_in:", data_in);
            }

            updateTorus();

        }

        rotatingCube.rotX(0.01);
        rotatingCube.rotY(0.01);

        if (data_out.hasOwnProperty("event") && typeof sendData_out === "function") {
            sendData_out(data_out);
        }
        
        return sceneObjects;
    }
}
