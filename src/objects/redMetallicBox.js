import * as THREE from 'three';
import cubeGeometry from "../geometry/cubeGeometry";
import redMetallicMaterial from "../material/redMetallicMaterial";

const redMetallicBox = new THREE.Mesh(cubeGeometry, redMetallicMaterial);

// Position above the small plane for visible shadow casting, lowered by 0.5 units
redMetallicBox.position.y = 1.0; // Lowered from 1.5 to 1.0

// Enable shadow casting and receiving
redMetallicBox.castShadow = true;
redMetallicBox.receiveShadow = true;

// Add rotation methods matching the original rotatingCube interface exactly
redMetallicBox.rotX = function (x) {
    this.rotation.x += x;
}

redMetallicBox.rotY = function (y) {
    this.rotation.y += y;
}

export default redMetallicBox;
